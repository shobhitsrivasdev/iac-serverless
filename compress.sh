zip -r serverless.zip ./
aws lambda update-function-code --function-name serverless --zip-file fileb://serverless.zip