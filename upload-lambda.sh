zip -r function.zip .
aws lambda update-function-code --function-name memnut-s3-presigned-url-lambda --zip-file fileb://function.zip