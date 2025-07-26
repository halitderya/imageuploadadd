terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.3.0"

  backend "s3" {
    bucket = "halit-tfstate-uk-2025"
    key    = "imageuploadapp/terraform.tfstate"
    region = "eu-west-2"
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "image_upload_bucket" {
  bucket = var.s3_bucket_name

  tags = {
    Name        = "ImageUploadBucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "public_access" {
  bucket = aws_s3_bucket.image_upload_bucket.id

  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}

output "s3_bucket_name" {
  value = aws_s3_bucket.image_upload_bucket.bucket
}
