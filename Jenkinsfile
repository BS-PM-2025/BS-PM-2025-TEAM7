pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                timeout(time: 15, unit: 'MINUTES') {
                    cleanWs()
                    git branch: 'main', credentialsId: 'd0527ca0-be7b-4822-94b9-add376ae57c0', url: 'https://github.com/BS-PM-2025/BS-PM-2025-TEAM7.git'
                }
            }
        }

        stage('Build') {
            steps {
                sh 'docker-compose -f $DOCKER_COMPOSE_FILE build'
            }
        }

        stage('Test') {
            steps {
                sh 'docker-compose -f $DOCKER_COMPOSE_FILE up -d'
                sh 'docker-compose -f $DOCKER_COMPOSE_FILE exec frontend npm test'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker-compose -f $DOCKER_COMPOSE_FILE down'
                sh 'docker-compose -f $DOCKER_COMPOSE_FILE up -d'
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker-compose -f $DOCKER_COMPOSE_FILE down'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}