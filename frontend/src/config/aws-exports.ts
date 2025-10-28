const awsConfig = {
  aws_project_region: 'us-east-1',
  aws_cognito_region: 'us-east-1',
  aws_user_pools_id: 'us-east-1_xI4Y8LRel',
  aws_user_pools_web_client_id: '3vratlm9ubst6882u4vfbsvru1',
  oauth: {
    domain: '',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: 'http://localhost:3000',
    redirectSignOut: 'http://localhost:3000',
    responseType: 'code'
  },
  federationTarget: 'COGNITO_USER_POOLS',
  aws_api_gateway_region: 'us-east-1',
  aws_api_gateway_url: 'https://gi0wwv0vo5.execute-api.us-east-1.amazonaws.com/prod'
};

export default awsConfig;


