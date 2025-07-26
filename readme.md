Workflow Steps

1. Trigger GitHub Actions on Git Push

1.1. A workflow file under .github/workflows/deploy.yml is triggered on every push
1.2. AWS credentials (access key and secret key) are securely loaded from GitHub Secrets
1.3. Necessary tools are installed, such as Terraform, AWS CLI, and zip utilities

2. Provision Infrastructure with Terraform

2.1. Initialize Terraform using terraform init
2.2. Validate configuration files with terraform validate
2.3. Show planned changes with terraform plan
2.4. Apply infrastructure changes with terraform apply
2.5. Resources like S3 buckets, IAM roles, EC2 instances, or Lambda functions are created or updated

3. Deploy Application

3.1. Application files (HTML, CSS, JS, or Node.js backend) are zipped if needed
3.2. If it is a static site, it is uploaded to the S3 bucket
3.3. If it runs on EC2, an SSH connection is established and files are copied and the service is restarted
3.4. If it is a Lambda function, the function is updated with the new code

4. Post-Deployment Cleanup and Outputs

4.1. Temporary files are removed
4.2. Terraform outputs (e.g., S3 website URL, public IP) are retrieved
4.3. Optional notifications can be sent via Slack or email
4.4. The workflow concludes with a success or failure status
