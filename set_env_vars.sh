# Core ENV Details
export SA_ENVIRONMENT='development'
export SA_SUB_ENVIRONMENT='sandbox'
export DEVOPS_ENV_ID='dev1-sandbox';

export DEVOPS_IP_ADDRESS='127.0.0.1';
export DEVOPS_APP_NAME='saas';

# Cache Engine
export SA_ONLY_SHARED_CACHE_ENGINE='memcached'
export SA_SHARED_MEMCACHE_SERVERS='127.0.0.1:11211'

# Database details
export SA_MYSQL_CONNECTION_POOL_SIZE='3'

export SA_SAAS_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_SAAS_SUBENV_MYSQL_USER='root'
export SA_SAAS_SUBENV_MYSQL_PASSWORD='root'

export SA_CONFIG_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_CONFIG_SUBENV_MYSQL_USER='root'
export SA_CONFIG_SUBENV_MYSQL_PASSWORD='root'

export SA_SAAS_BIG_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_SAAS_BIG_SUBENV_MYSQL_USER='root'
export SA_SAAS_BIG_SUBENV_MYSQL_PASSWORD='root'

export SA_KIT_SAAS_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_KIT_SAAS_SUBENV_MYSQL_USER='root'
export SA_KIT_SAAS_SUBENV_MYSQL_PASSWORD='root'

export SA_KIT_SAAS_MYSQL_HOST='127.0.0.1'
export SA_KIT_SAAS_MYSQL_USER='root'
export SA_KIT_SAAS_MYSQL_PASSWORD='root'

export SA_KIT_SAAS_BIG_SUBENV_MYSQL_HOST='127.0.0.1'
export SA_KIT_SAAS_BIG_SUBENV_MYSQL_USER='root'
export SA_KIT_SAAS_BIG_SUBENV_MYSQL_PASSWORD='root'

# AWS-KMS details
export SA_KMS_AWS_ACCESS_KEY='AKIAJUDRALNURKAVS5IQ'
export SA_KMS_AWS_SECRET_KEY='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'
export SA_KMS_AWS_REGION='us-east-1'
export SA_API_KEY_KMS_ARN='arn:aws:kms:us-east-1:604850698061:key'
export SA_API_KEY_KMS_ID='eab8148d-fd9f-451d-9eb9-16c115645635'
export SA_KNOWN_ADDRESS_KMS_ARN='arn:aws:kms:us-east-1:604850698061:key'
export SA_KNOWN_ADDRESS_KMS_ID='eab8148d-fd9f-451d-9eb9-16c115645635'
export SA_CONFIG_STRATEGY_KMS_ARN='arn:aws:kms:us-east-1:604850698061:key'
export SA_CONFIG_STRATEGY_KMS_ID='eab8148d-fd9f-451d-9eb9-16c115645635'

# JWT details
export SA_INTERNAL_API_SECRET_KEY='1somethingsarebetterkeptinenvironemntvariables'

# SHA256 details
export SA_GENERIC_SHA_KEY='9fa6baa9f1ab7a805b80721b65d34964170b1494'
export SA_CACHE_DATA_SHA_KEY='066f7e6e833db143afee3dbafc888bcf'

# Web3 pool size
export OST_WEB3_POOL_SIZE=10

# Aux and Origin Gas Prices
export SA_MIN_ORIGIN_GAS_PRICE='0xBA43B7400';
export SA_MAX_ORIGIN_GAS_PRICE='0x174876E800';
export SA_DEFAULT_ORIGIN_GAS_PRICE='0x1176592E00';
export SA_BUFFER_ORIGIN_GAS_PRICE='0xBA43B7400';
export SA_DEFAULT_AUX_GAS_PRICE='0x3B9ACA00';