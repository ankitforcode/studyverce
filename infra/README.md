# StudyVerce AWS infrastructure

CDK stack for **socket server + Redis + ALB**. The Next.js web app deploys separately via **AWS Amplify** (`amplify.yml` at repo root).

## What this stack creates

| Resource | Purpose |
|----------|---------|
| VPC (public + isolated subnets, no NAT) | Dev-cost networking |
| ElastiCache Serverless (Redis) | Presence, timers, rate limits |
| ECR `studyverce-socket` | Socket server container images |
| ECS Fargate `studyverce-socket` | Socket.IO service |
| ALB `studyverce-socket` | HTTPS/WebSocket entry (HTTP :80 scaffold) |
| Secrets Manager `studyverce/socket-server` | Supabase URL, JWT secret, `DATABASE_URL` |

## Prerequisites

- AWS CLI + CDK CLI (`npm i -g aws-cdk`)
- Docker (for socket image builds)
- Node.js 20+
- Supabase Cloud project with migrations applied (`supabase db push`)

## One-time AWS setup

### 1. Bootstrap CDK

```bash
cd infra
npm install
npx cdk bootstrap
```

### 2. GitHub Actions OIDC role

Create an IAM role `GitHubActionsStudyverceDeploy` trusted by GitHub OIDC:

- Provider: `token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`
- Subject: `repo:<org>/studyverce:ref:refs/heads/main`

Attach policies (tighten for production):

- `AmazonEC2ContainerRegistryPowerUser`
- `AmazonECS_FullAccess`
- `CloudFormationFullAccess` (or scoped CDK deploy policy)
- `SecretsManagerReadWrite` (socket secret updates)

Save the role ARN as GitHub secret `AWS_DEPLOY_ROLE_ARN`.

### 3. GitHub repository configuration

| Type | Name | Example |
|------|------|---------|
| Secret | `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123456789012:role/GitHubActionsStudyverceDeploy` |
| Variable | `AWS_REGION` | `us-east-1` |
| Variable | `AMPLIFY_APP_URL` | `https://main.d1234.amplifyapp.com` (socket `CORS_ORIGIN`) |

### 4. Amplify Hosting (web)

1. Amplify Console → **Create app** → connect this GitHub repo.
2. Set **Monorepo app root**: `apps/web` (or env `AMPLIFY_MONOREPO_APP_ROOT=apps/web`).
3. Build spec: use root `amplify.yml` (auto-detected).
4. Add environment variables (Amplify Console → Environment variables):

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only |
| `NEXT_PUBLIC_APP_URL` | Amplify app URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://<SocketAlbDnsName>` from CDK output (use HTTPS after ACM) |
| `REDIS_URL` | Optional — use Upstash or ElastiCache endpoint if web needs Redis |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional |

5. Supabase **Authentication → URL configuration**: add your production URL + `/auth/callback` (e.g. `https://www.studyverce.com/auth/callback`).
6. **Hosting → General**: confirm **Platform** is **Web** (Next.js SSR / `WEB_COMPUTE`), not a static site. A static deploy serves from S3 and returns **404** on `/` even when the build succeeds.
7. Set `NEXT_PUBLIC_APP_URL` to your canonical origin (e.g. `https://www.studyverce.com`).

**404 on custom domain (`server: AmazonS3` in response headers)?** The monorepo artifact path was wrong or Amplify is not in Web Compute mode. Root `amplify.yml` must use `buildPath: /` and `baseDirectory: apps/web/.next`, plus repo-root `.npmrc` with `node-linker=hoisted`.

### 5. Deploy infrastructure

```bash
cd infra
npx cdk deploy -c corsOrigin=https://main.d1234.amplifyapp.com
```

### 6. Configure socket secrets

Update Secrets Manager secret `studyverce/socket-server`:

- `SUPABASE_URL` — `https://<ref>.supabase.co`
- `SUPABASE_JWT_SECRET` — Supabase Dashboard → API → JWT Secret
- `DATABASE_URL` — Supabase **pooler** URL (port `6543`)

### 7. First socket image

Push an image before ECS can become healthy:

```bash
# From repo root
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -f apps/socket-server/Dockerfile -t studyverce-socket .
docker tag studyverce-socket:latest <account>.dkr.ecr.us-east-1.amazonaws.com/studyverce-socket:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/studyverce-socket:latest
aws ecs update-service --cluster studyverce --service studyverce-socket --force-new-deployment
```

Or run the **Deploy AWS** GitHub Action on `main`.

## Ongoing deploys

`.github/workflows/deploy-aws.yml` on push to `main`:

| Path change | Job |
|-------------|-----|
| `infra/**` | `cdk deploy` |
| `apps/socket-server/**`, shared packages | Build → ECR → ECS rolling deploy |

The Next.js web app deploys via **Amplify Console Git integration** on branch push (not GitHub Actions).

## Outputs

After `cdk deploy`:

- **SocketAlbDnsName** → set `NEXT_PUBLIC_SOCKET_URL` in Amplify
- **EcrRepositoryUri** → CI pushes here
- **RedisEndpoint** → injected into socket task as `REDIS_URL`

## Production hardening (later)

- ACM certificate + ALB HTTPS listener (:443)
- Custom domain (Route 53) for socket host, e.g. `socket.example.com`
- NAT Gateway + private Fargate tasks
- WAF on ALB
- Socket.IO Redis adapter before scaling ECS `desiredCount` > 1

## Useful commands

```bash
cd infra
npm run synth
npm run diff
npm run deploy
aws logs tail /studyverce/socket-server --follow
curl http://<SocketAlbDnsName>/health
```
