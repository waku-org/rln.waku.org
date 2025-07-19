#!/usr/bin/env groovy
library 'status-jenkins-lib@v1.8.8'

pipeline {
  agent { label 'linux' }

  parameters {
    string(
      name: 'IMAGE_TAG',
      defaultValue: params.IMAGE_TAG ?: deployBranch(),
      description: 'Optional Docker image tag to push.'
    )
    string(
      name: 'DOCKER_REGISTRY',
      description: 'Docker registry ',
      defaultValue: params.DOCKER_REGISTRY ?: 'harbor.status.im',
    )
  }

  options {
    disableRestartFromStage()
    disableConcurrentBuilds()
    /* manage how many builds we keep */
    buildDiscarder(logRotator(
      numToKeepStr: '20',
      daysToKeepStr: '30',
    ))
  }

  environment {
    IMAGE_NAME = 'wakuorg/rln-keystore-management'
    NEXT_PUBLIC_SITE_URL = "https://${deployDomain()}"
  }

  stages {
    stage('Build') {
      steps {
        script {
          image = docker.build(
            "${DOCKER_REGISTRY}/${IMAGE_NAME}:${GIT_COMMIT.take(8)}"
          )
        }
      }
    }

    stage('Push') {
      steps { script {
        withDockerRegistry([
          credentialsId: 'harbor-wakuorg-robot', url: "https://${DOCKER_REGISTRY}",
        ]) {
          image.push()
        }
      } }
    }

    stage('Deploy') {
      when { expression { params.IMAGE_TAG != '' } }
      steps { script {
        withDockerRegistry([
          credentialsId: "harbor-wakuorg-robot", url: "https://${DOCKER_REGISTRY}",
        ]) {
          image.push(params.IMAGE_TAG)
        }
      } }
    }
  }

  post {
    cleanup { cleanWs() }
  }
}

def isMasterBranch() { GIT_BRANCH ==~ /.*master/ }
def deployBranch() { isMasterBranch() ? 'deploy-master' : 'deploy-develop' }
def deployDomain() { isMasterBranch() ? 'waku.org' : 'dev.waku.org' }
