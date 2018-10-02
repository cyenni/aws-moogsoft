#!/bin/bash

echo "Installing AIOps"
cd ~/

source ~/.bashrc || true

#snapshot pre-install - rpms downloaded
yum -y install moogsoft-db \
            moogsoft-common \
            moogsoft-integrations \
            moogsoft-integrations-ui \
            moogsoft-mooms \
            moogsoft-search \
            moogsoft-server \
            moogsoft-ui \
            moogsoft-utils

echo "download MySQL connector and install it"
wget https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-5.1.45.tar.gz -P ~/

tar --strip-components 1 -xvf ~/mysql-connector-java-5.1.45.tar.gz -C /usr/share/moogsoft/lib/cots/nonDist/ mysql-connector-java-5.1.45/mysql-connector-java-5.1.45-bin.jar --transform 's/-bin//'


echo "Bring on the Mooooooo! You're going to need to answer some questions so get ready to hit enter a few times"
/usr/share/moogsoft/bin/utils/moog_init.sh -I MY_ZONE -u root
chkconfig moogfarmd on
service moogfarmd start
