# Serverless

## Introduction
This Node.js script is designed to be deployed as an AWS Lambda function. It handles the processing of events, which involves downloading files from a provided URL, uploading them to Google Cloud Storage, and then sending email notifications via Mailgun.

## Setup
### Prerequisites
- Node.js and npm
- AWS CLI configured with appropriate permissions
- A Google Cloud project with Storage and a service account
- Mailgun account with a domain and API key

### Environment Variables
Set the following environment variables:
- `MAILGUN_DOMAIN`
- `MAILGUN_KEY`
- `GCP_PRIVATE_KEY` (Base64 encoded JSON key file)
- `GCS_BUCKET_NAME`
- `DYNAMODB_TABLE_NAME`

## Usage
### Deployment
Deploy the script to AWS Lambda, ensuring all the required environment variables and permissions are set.

### Invocation
This Lambda function is triggered by an SNS event. Ensure the event payload is structured correctly with fields like `releaseUrl`, `email`, `assignment_id`, and `user_id`.


## Contributing
Contributions to this project are welcome. Please follow these steps:
1. Fork the repository
2. Create a new branch for your feature or fix
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
