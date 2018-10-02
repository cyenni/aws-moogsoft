#!/bin/bash

echo
echo -n "****MOOGSOFT 6.5 AUTOMATED INSTALL****"
echo

function setSpeedyUser(){
		conn_check=$(curl -s --head --user ${MOOGUSER}:${MOOGPASS}  --request GET https://speedy.moogsoft.com/repo/aiops/esr/ | grep "200 OK")

		if [[ $conn_check ]]; then
			echo "Creating Moogsoft Yum Repo"
            cat > /etc/yum.repos.d/moogsoft-aiops.repo << EOL
            [moogsoft-aiops]
            name=moogsoft-aiops-latest
            baseurl=https://$USER:$PASS@speedy.moogsoft.com/repo/aiops/esr
            enabled=1
            gpgcheck=0
            sslverify=0
EOL

		else
			echo "connection check failed - please enter credentials or Slack Kirk Sievers for speedy access"
			echo
			exit 1
		fi
}

setSpeedyUser
cd ~/

#while loop while credentials aren't valid
#while 

echo "Installing EPEL"
yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm

echo "Installing MySQL"
yum -y install http://repo.mysql.com/mysql57-community-release-el7.rpm

echo "Installing RabbitMQ"
yum -y install https://github.com/rabbitmq/erlang-rpm/releases/download/v20.1.7/erlang-20.1.7-1.el7.centos.x86_64.rpm
curl -s https://packagecloud.io/install/repositories/rabbitmq/rabbitmq-server/script.rpm.sh | sudo bash

#echo "Verify RabbitMQ"
#cat /etc/yum.repos.d/rabbitmq_rabbitmq-server.repo

echo "Installing ElasticSearch"
rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

echo "Setting up the ElasticSearch repo"
cat > /etc/yum.repos.d/elasticsearch.repo << EOL
[elasticsearch-5.x]
name=Elasticsearch repository for 5.x packages
baseurl=https://artifacts.elastic.co/packages/5.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOL

echo "creating nginx repo"
cat > /root/create_nginx_repo.sh << EOL
#!/bin/bash
 
echo '[nginx]' > /etc/yum.repos.d/nginx.repo
echo 'name=nginx repo' >> /etc/yum.repos.d/nginx.repo
echo 'baseurl=http://nginx.org/packages/OS/OSRELEASE/\$basearch/' >> /etc/yum.repos.d/nginx.repo
echo 'gpgcheck=0' >> /etc/yum.repos.d/nginx.repo
echo 'enabled=1' >> /etc/yum.repos.d/nginx.repo
 
OS_VERSION=\$(cat /etc/system-release)
case "\$OS_VERSION" in
    CentOS*release\ 6* )
            sed -i -e 's/OS/centos/' -e 's/OSRELEASE/6/' /etc/yum.repos.d/nginx.repo;;
    CentOS*release\ 7* )
            sed -i -e 's/OS/centos/' -e 's/OSRELEASE/7/' /etc/yum.repos.d/nginx.repo;;
    Red\ Hat*release\ 6* )
            sed -i -e 's/OS/rhel/' -e 's/OSRELEASE/6/' /etc/yum.repos.d/nginx.repo;;
    Red\ Hat*release\ 7* )
            sed -i -e 's/OS/rhel/' -e 's/OSRELEASE/7/' /etc/yum.repos.d/nginx.repo;;
esac
EOL
bash /root/create_nginx_repo.sh

echo "Updating nss packages"
yum -y update nss

echo "Creating Moogsoft Yum Repo"
cat > /etc/yum.repos.d/moogsoft-aiops.repo << EOL
[moogsoft-aiops]
name=moogsoft-aiops-latest
baseurl=https://$USER:$PASS@speedy.moogsoft.com/repo/aiops/esr
enabled=1
gpgcheck=0
sslverify=0
EOL

echo "Installing Tomcat"
yum -y install https://$USER:$PASS@speedy.moogsoft.com/offline/7/tomcat-native-1.1.34-1.el7.x86_64.rpm

echo "Setting SELinux to permissive mode"
setenforce 0

