#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StudyverceStack } from "../lib/studyverce-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION ?? "us-east-1";

new StudyverceStack(app, "StudyverceStack", {
  env: account ? { account, region } : { region },
  description: "StudyVerce socket server (ECS Fargate), Redis, and ALB",
});
