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
##################### ROLES ###############

resource "aws_iam_role" "MyFunction-role-49s2whj6" {
  name = "MyFunction-role-49s2whj6"
  max_session_duration= 3600
  description = "Allows fuction to run"


  assume_role_policy = jsonencode({
    Version = "2012-10-17"
       "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "lambda.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
  
  })

  tags = {
    tag-key = "tag-value"
  },
  
}
##################### ROLES END ###############
resource "aws_s3_bucket_public_access_block" "public_access" {
  bucket = aws_s3_bucket.image_upload_bucket.id

  block_public_acls   = true
  block_public_policy = true
  ignore_public_acls  = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "image_bucket" {
  bucket = var.aws_s3_image_bucket

  tags = {
    Name        = "ImageUploadBucket"
    Environment = var.environment
  }

}

resource "aws_lambda_function" "image_upload_lambda" {
  function_name = "imageUploadFunction"
  s3_bucket     = aws_s3_bucket.image_upload_bucket.bucket
  filename = "${path.module}/lambda_function.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_function.zip")
  
  handler = "index.handler"
  runtime = "nodejs18.x"

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.image_upload_bucket.bucket
    }
  }

  tags = {
    Name        = "ImageUploadLambda"
    Environment = var.environment
  }
}

resource "aws_lambda_function_url" "image_upload_lambda_url" {
  function_name      = aws_lambda_function.image_upload_lambda.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["POST", "OPTIONS"]
    allow_headers     = ["content-type", "accept"]
    expose_headers    = []
    max_age          = 86400
  }
}

output "lambda_function_url" {
  value = aws_lambda_function_url.image_upload_lambda_url.function_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.image_upload_bucket.bucket
}
