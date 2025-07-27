variable "s3_bucket_name" {
  description = "The name of the S3 bucket for image upload"
  type        = string
  default     = "halit-imageupload-app-2025"  
}

variable "aws_region" {
    description = "AWS Region"
    type        = string
    default     = "eu-west-2"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "image_bucket" {
  description = "The name of the S3 bucket for image upload"
  type        = string
  default     = "halit-imageupload-app-2025"
}