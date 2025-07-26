variable "s3_bucket_name" {
  description = "The name of the S3 bucket for image upload"
  type        = string
}

variable "aws_region"{
    description="AWS Region"
    type="string"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}