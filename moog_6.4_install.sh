#!/bin/bash

cd ~/

source ~/.bashrc || true

#snapshot pre-install - rpms downloaded
yum install moogsoft-db-6.4.0.2-16 moogsoft-eula-20171109-122 moogsoft-common-6.4.0.2-16 moogsoft-lams-6.4.0.2-16 moogsoft-mooms-6.4.0.2-16 moogsoft-search-6.4.0.2-16 moogsoft-server-6.4.0.2-16 moogsoft-ui-6.4.0.2-16 moogsoft-utils-6.4.0.2-16

wget https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-5.1.45.tar.gz

tar --strip-components 1 -xvf ~/mysql-connector-java-5.1.45.tar.gz -C $MOOGSOFT_HOME/lib/cots/nonDist/ ~/mysql-connector-java-5.1.45/mysql-connector-java-5.1.45-bin.jar --transform 's/-bin//'

$MOOGSOFT_HOME/bin/utils/moog_init.sh -I MY_ZONE -u root

service moogfarmd start
