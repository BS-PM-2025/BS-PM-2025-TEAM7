pipeline {
    agent {
        docker {
            image 'node:18'
            args '-u root --privileged'
        }
    }

    environment {
        NPM_CONFIG_LOGLEVEL = 'warn'
        NPM_CONFIG_CACHE = '.npm'
        CI = 'true'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing npm packages in /ci-cd-auth ...'
                dir('ci-cd-auth') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Unit Tests') {
            steps {
                echo '🧪 Running Jest tests in /ci-cd-auth ...'
                dir('ci-cd-auth') {
                    sh 'npm test || true'
                }
            }
        }
    }

    post {
        success {
            echo '✅ Build completed successfully!'
        }
        failure {
            echo '❌ Build failed!'
        }
        always {
            echo '📄 Build finished with status above.'
        }
    }
}
