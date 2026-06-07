import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface StudyverceStackProps extends cdk.StackProps {
  /**
   * Amplify web app origin for socket CORS, e.g. https://main.d1234.amplifyapp.com
   * Override: cdk deploy -c corsOrigin=https://app.example.com
   */
  readonly corsOrigin?: string;
  /**
   * Existing VPC to use (default VPC in eu-north-1).
   * Override: cdk deploy -c vpcId=vpc-xxxxxxxx
   */
  readonly vpcId?: string;
  /**
   * ElastiCache Redis node size (smallest: cache.t4g.micro).
   * Override: cdk deploy -c cacheNodeType=cache.t4g.small
   */
  readonly cacheNodeType?: string;
  /**
   * ECR image tag for the socket container (CI passes git SHA).
   * Override: cdk deploy -c socketImageTag=abc1234
   */
  readonly socketImageTag?: string;
  /**
   * Route 53 hosted zone for DNS validation and the socket CNAME.
   * Override: cdk deploy -c hostedZoneName=studyverce.com
   */
  readonly hostedZoneName?: string;
  /**
   * Public socket hostname (ACM cert + Route 53 record).
   * Override: cdk deploy -c socketDomainName=websocket.studyverce.com
   */
  readonly socketDomainName?: string;
}

const ECR_REPOSITORY_NAME = "studyverce-socket";

/** Public subnets only — no NAT gateway; tasks reach the internet via public IPs. */
function publicSubnetIds(vpc: ec2.IVpc): string[] {
  const ids = vpc.publicSubnets.map((subnet) => subnet.subnetId);
  if (ids.length === 0) {
    throw new Error(
      "VPC has no public subnets. This stack does not create NAT gateways or private subnets."
    );
  }
  return ids;
}

const PUBLIC_SUBNETS: ec2.SubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };

export class StudyverceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StudyverceStackProps) {
    super(scope, id, props);

    const corsOrigin =
      props?.corsOrigin ??
      (this.node.tryGetContext("corsOrigin") as string | undefined) ??
      "https://localhost:3001";

    const vpcId =
      props?.vpcId ??
      (this.node.tryGetContext("vpcId") as string | undefined) ??
      "vpc-0cd78532e2b1cacf1";

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", { vpcId });

    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
      description: "StudyVerce socket ALB",
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "HTTP from internet"
    );
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "HTTPS from internet"
    );

    const socketSecurityGroup = new ec2.SecurityGroup(this, "SocketSecurityGroup", {
      vpc,
      description: "StudyVerce socket ECS tasks",
      allowAllOutbound: true,
    });
    socketSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3002),
      "Socket traffic from ALB"
    );

    const redisSecurityGroup = new ec2.SecurityGroup(this, "RedisSecurityGroup", {
      vpc,
      description: "StudyVerce ElastiCache Redis",
      allowAllOutbound: false,
    });
    redisSecurityGroup.addIngressRule(
      socketSecurityGroup,
      ec2.Port.tcp(6379),
      "Redis from socket tasks"
    );

    const cacheNodeType =
      props?.cacheNodeType ??
      (this.node.tryGetContext("cacheNodeType") as string | undefined) ??
      "cache.t4g.micro";

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, "RedisSubnetGroup", {
      description: "StudyVerce Redis public subnets",
      subnetIds: publicSubnetIds(vpc),
      cacheSubnetGroupName: "studyverce-redis",
    });

    const redis = new elasticache.CfnCacheCluster(this, "Redis", {
      engine: "redis",
      cacheNodeType,
      numCacheNodes: 1,
      clusterName: "studyverce-redis",
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
    });
    redis.addDependency(redisSubnetGroup);

    const socketSecret = new secretsmanager.Secret(this, "SocketSecret", {
      secretName: "studyverce/socket-server",
      description: "Supabase and Postgres credentials for the socket server",
      secretObjectValue: {
        SUPABASE_URL: cdk.SecretValue.unsafePlainText("https://YOUR_PROJECT.supabase.co"),
        SUPABASE_JWT_SECRET: cdk.SecretValue.unsafePlainText("REPLACE_ME"),
        DATABASE_URL: cdk.SecretValue.unsafePlainText(
          "postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres"
        ),
      },
    });

    const socketImageTag =
      props?.socketImageTag ??
      (this.node.tryGetContext("socketImageTag") as string | undefined) ??
      "latest";

    // Created by CI (aws ecr create-repository) when missing; CDK imports by name.
    const repository = ecr.Repository.fromRepositoryName(
      this,
      "SocketRepository",
      ECR_REPOSITORY_NAME
    );

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: "studyverce",
    });

    // Register Fargate capacity providers once (avoid CDK auto-association updates racing ECS deploys).
    const clusterCapacityProviders = new ecs.CfnClusterCapacityProviderAssociations(
      this,
      "ClusterCapacityProviders",
      {
        cluster: cluster.clusterName,
        capacityProviders: ["FARGATE", "FARGATE_SPOT"],
        defaultCapacityProviderStrategy: [],
      }
    );
    // Create: cluster → capacity providers → service. Delete: service → capacity providers → cluster.
    clusterCapacityProviders.addDependency(cluster.node.defaultChild as ecs.CfnCluster);

    const logGroup = new logs.LogGroup(this, "SocketLogGroup", {
      logGroupName: "/studyverce/socket-server",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskExecutionRole = new iam.Role(this, "SocketTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });
    socketSecret.grantRead(taskExecutionRole);
    repository.grantPull(taskExecutionRole);

    const taskDefinition = new ecs.FargateTaskDefinition(this, "SocketTaskDefinition", {
      family: "studyverce-socket",
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole: taskExecutionRole,
    });

    const redisHost = redis.attrRedisEndpointAddress;
    const redisPort = redis.attrRedisEndpointPort;

    const container = taskDefinition.addContainer("socket-server", {
      image: ecs.ContainerImage.fromEcrRepository(repository, socketImageTag),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "socket",
        logGroup,
      }),
      environment: {
        NODE_ENV: "production",
        PORT: "3002",
        CORS_ORIGIN: corsOrigin,
        // Pass host/port separately — Fn::Join URL strings can resolve to redis://: before Redis exists.
        REDIS_HOST: redisHost,
        REDIS_PORT: redisPort,
      },
      secrets: {
        SUPABASE_URL: ecs.Secret.fromSecretsManager(socketSecret, "SUPABASE_URL"),
        SUPABASE_JWT_SECRET: ecs.Secret.fromSecretsManager(
          socketSecret,
          "SUPABASE_JWT_SECRET"
        ),
        DATABASE_URL: ecs.Secret.fromSecretsManager(socketSecret, "DATABASE_URL"),
      },
      healthCheck: {
        command: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3002/health || exit 1"],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(30),
      },
    });
    container.addPortMappings({ containerPort: 3002, protocol: ecs.Protocol.TCP });
    taskDefinition.node.addDependency(redis);

    const service = new ecs.FargateService(this, "SocketService", {
      cluster,
      serviceName: "studyverce-socket",
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [socketSecurityGroup],
      vpcSubnets: PUBLIC_SUBNETS,
      capacityProviderStrategies: [
        {
          capacityProvider: "FARGATE_SPOT",
          weight: 1,
        },
      ],
      circuitBreaker: { rollback: true },
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });
    service.node.addDependency(redis);
    service.node.addDependency(clusterCapacityProviders);

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "SocketAlb", {
      vpc,
      internetFacing: true,
      vpcSubnets: PUBLIC_SUBNETS,
      securityGroup: albSecurityGroup,
      loadBalancerName: "studyverce-socket",
    });
    loadBalancer.setAttribute("idle_timeout.timeout_seconds", "3600");

    const hostedZoneName =
      props?.hostedZoneName ??
      (this.node.tryGetContext("hostedZoneName") as string | undefined) ??
      "studyverce.com";
    const socketDomainName =
      props?.socketDomainName ??
      (this.node.tryGetContext("socketDomainName") as string | undefined) ??
      "websocket.studyverce.com";

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: hostedZoneName,
    });

    const certificate = new acm.Certificate(this, "SocketCertificate", {
      domainName: socketDomainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const httpsListener = loadBalancer.addListener("HttpsListener", {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [certificate],
      open: true,
    });

    const targetGroup = httpsListener.addTargets("SocketTargets", {
      port: 3002,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: "/health",
        healthyHttpCodes: "200",
        interval: cdk.Duration.seconds(30),
      },
      stickinessCookieDuration: cdk.Duration.hours(1),
    });
    targetGroup.setAttribute("stickiness.enabled", "true");

    loadBalancer.addListener("HttpListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: "HTTPS",
        port: "443",
        permanent: true,
      }),
    });

    const socketRecordName = socketDomainName.endsWith(`.${hostedZoneName}`)
      ? socketDomainName.slice(0, -(hostedZoneName.length + 1))
      : socketDomainName;

    new route53.CnameRecord(this, "SocketWebSocketCname", {
      zone: hostedZone,
      recordName: socketRecordName,
      domainName: loadBalancer.loadBalancerDnsName,
    });

    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: repository.repositoryUri,
      description: "Socket-server ECR repository (managed by CI)",
    });

    new cdk.CfnOutput(this, "SocketImageTag", {
      value: socketImageTag,
      description: "ECS task image tag deployed by this stack revision",
    });

    new cdk.CfnOutput(this, "SocketAlbDnsName", {
      value: loadBalancer.loadBalancerDnsName,
      description: "ALB DNS name (CNAME target for websocket subdomain)",
    });

    new cdk.CfnOutput(this, "SocketDomainName", {
      value: socketDomainName,
      description: "Set NEXT_PUBLIC_SOCKET_URL=https://<this-host>",
    });

    new cdk.CfnOutput(this, "SocketCertificateArn", {
      value: certificate.certificateArn,
      description: "ACM certificate for the socket ALB (DNS-validated via Route 53)",
    });

    new cdk.CfnOutput(this, "RedisEndpoint", {
      value: `${redisHost}:${redisPort}`,
      description: "ElastiCache Redis endpoint (injected into ECS as REDIS_URL)",
    });

    new cdk.CfnOutput(this, "RedisNodeType", {
      value: cacheNodeType,
      description: "ElastiCache Redis node class",
    });

    new cdk.CfnOutput(this, "SocketSecretArn", {
      value: socketSecret.secretArn,
      description: "Update secret values before first healthy deploy",
    });

    new cdk.CfnOutput(this, "EcsClusterName", {
      value: cluster.clusterName,
    });

    new cdk.CfnOutput(this, "EcsServiceName", {
      value: service.serviceName,
    });

    new cdk.CfnOutput(this, "VpcId", {
      value: vpc.vpcId,
      description: "Existing VPC used by this stack",
    });
  }
}
