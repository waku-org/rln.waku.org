# Waku Keystore Management

Application to manage Waku RLN keystores.

## Static Export & Deployment

This app is a fully static site. To build and deploy:

1. Install dependencies:
   ```sh
   npm install
   ```
2. Build the static site:
   ```sh
   npm run build
   ```
   The static site will be output to the `out/` directory.
3. Deploy the contents of the `out/` directory to any static host (e.g., Netlify, Vercel static, GitHub Pages, S3, etc.).

## Overview

This application provides an interface for managing keystores for Waku's rate-limiting nullifier (RLN) functionality. It integrates with MetaMask for wallet connectivity.

## Features

- Connect to MetaMask wallet with dropdown menu for account details
- Terminal-inspired UI with cyberpunk styling
- View wallet information including address, network, and balance
- Support for Linea Sepolia testnet only
- Keystore management with copy, view, export, and remove functionality
- Token approval for RLN membership registration
- Light/standard RLN implementation toggle


## Linea Sepolia Network

This application is configured to use ONLY the Linea Sepolia testnet. If you don't have Linea Sepolia configured in your MetaMask, the application will help you add it with the following details:

- **Network Name**: Linea Sepolia Testnet
- **RPC URL**: https://rpc.sepolia.linea.build
- **Chain ID**: 59141
- **Currency Symbol**: ETH
- **Block Explorer URL**: https://sepolia.lineascan.build

You can get Linea Sepolia testnet ETH from the [Linea Faucet](https://faucet.goerli.linea.build/).

## RLN Membership Registration

When registering for RLN membership, you'll need to complete two transactions:

1. **Token Approval**: First, you'll need to approve the RLN contract to spend tokens on your behalf. This is a one-time approval.
2. **Membership Registration**: After approval, the actual membership registration transaction will be submitted.

If you encounter an "ERC20: insufficient allowance" error, it means the token approval transaction was not completed successfully. Please try again and make sure to approve the token spending in your wallet.

## Contracts

1. Waku Testnet Tokens: 0x185A0015aC462a0aECb81beCc0497b649a64B9ea
2. RLN Registration Contract: 0xB9cd878C90E49F797B4431fBF4fb333108CB90e6

## CI/CD

PRs should be made for `develop` branch and `master` should be [rebased](https://git-scm.com/book/en/v2/Git-Branching-Rebasing) on `develop` once changes are verified.

- [CI builds](https://ci.infra.status.im/job/website/job/rln.waku.org/) `master` and pushes to `deploy-master` branch, which is hosted at <https://rln.waku.org/>.
- [CI builds](https://ci.infra.status.im/job/website/job/dev-rln.waku.org/) `develop` and pushes to `deploy-develop` branch, which is hosted at <https://dev-rln.waku.org/>.

The hosting is done using [`nextjs-website` Ansible role in `infra-sites`](https://github.com/status-im/infra-sites/blob/master/ansible/vars/press/rln_waku_org.yml).
