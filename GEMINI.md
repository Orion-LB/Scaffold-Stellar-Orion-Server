# Project Overview

This project is a Scaffold Stellar Frontend, a toolkit for building modern Stellar smart contract frontends. It provides a comprehensive development environment with a Vite-powered React and TypeScript frontend, along with a suite of example smart contracts written in Rust.

The project is structured as a monorepo with a `contracts` directory for the Rust smart contracts and a `src` directory for the React frontend. It also includes an auto-generated TypeScript client for interacting with the smart contracts.

## Key Technologies

-   **Frontend:**
    -   React
    -   TypeScript
    -   Vite
    -   Stellar SDK
-   **Backend (Smart Contracts):**
    -   Rust
    -   Soroban

## Building and Running

To get started with the project, you need to have Rust, Cargo, Node.js, and the Stellar CLI installed.

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the development server:**

    ```bash
    npm run dev
    ```

    This will start the Vite development server and watch for changes in the smart contracts.

3.  **Build the project for production:**

    ```bash
    npm run build
    ```

    This will create a production-ready build in the `dist` directory.

## Development Conventions

-   **Linting:** The project uses ESLint for linting the TypeScript code. You can run the linter with the following command:

    ```bash
    npm run lint
    ```

-   **Formatting:** The project uses Prettier for code formatting. You can format the code with the following command:

    ```bash
    npm run format
    ```

-   **Smart Contracts:** The smart contracts are located in the `contracts` directory. Each contract has its own `Cargo.toml` file. The main `Cargo.toml` file in the root directory defines the workspace.
-   **TypeScript Clients:** The TypeScript clients for the smart contracts are auto-generated and located in the `packages` directory.
-   **Committing:** The project uses `husky` and `lint-staged` to run linters on staged files before committing.
