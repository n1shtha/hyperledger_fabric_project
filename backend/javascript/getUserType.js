/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const { Gateway, Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const fs = require("fs");
const path = require("path");

async function getUserType(username) {
    try {
        // load the network configuration
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

        // Create a new CA client for interacting with the CA.
        const caURL = ccp.certificateAuthorities["ca.org1.example.com"].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've enrolled the user.
        const userIdentity = await wallet.get(username);
        if (!userIdentity) {
            console.log(
                `An identity for the user ${username} does not exist in the wallet, please register first.`
            );
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: username,
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("DigiDonor");

        // Register the user such that it reflects in the chaincode
        const getUserTypeResponse = await contract.submitTransaction( "GetUserType", username);
        console.log(getUserTypeResponse);

        if (getUserTypeResponse) {
            console.log(
                `Successfully got user type for ${username}.`
            );
            return getUserTypeResponse;
        } else {
            console.log(getUserTypeResponse.toString());
        }
        // Disconnect from the gateway after executing registration
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to get user type for ${username}: ${error}`);
        process.exit(1);
    }
} 


module.exports = getUserType;