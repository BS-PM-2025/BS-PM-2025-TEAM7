pipeline {
    agent {
        docker {
            image 'node:18'
        }
    }

    environment {
        NPM_CONFIG_LOGLEVEL = 'warn'
        NPM_CONFIG_CACHE = '.npm'
        CI = 'true'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
    }

    stages {
        stage('Install All Dependencies') {
            steps {
                echo '📦 Installing dependencies for root and backend...'
                sh '''
                    npm install
                    npm --prefix ci-cd-auth install
                '''
            }
        }

        stage('Run Backend Tests') {
            steps {
                echo '🧪 Running backend unit tests...'
                dir('ci-cd-auth') {
                    sh 'ls -la'
                    sh 'npx jest hakathonTest/tests1.test.js --verbose'
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
