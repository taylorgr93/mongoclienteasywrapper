// mongoDBConnectionManager.js
const { MongoClient } = require("mongodb");

/**
 * MongoDBConnectionManager
 * ------------------------------------------------------------------
 * Singleton that maintains a single MongoClient and caches Db handles
 * per database name. Exported as a single shared instance.
 */
class MongoDBConnectionManager {
  constructor() {
    this.connections = {}; // Stores connections by database name
    this.client = null; // Single client for all databases
  }

  async connect(uri) {
    if (!this.client) {
      // Create client only after successful connection
      const client = new MongoClient(uri);
      await client.connect();
      this.client = client;
      console.log("Connection to the MongoDB server established.");
    }
  }

  isConnected() {
    // topology.s.state is an internal API — no public isConnected() exists in Driver 4.x
    return this.client?.topology?.s?.state === "connected";
  }

  getDatabase(dbName) {
    if (!this.client) {
      throw new Error(
        "You must connect to the server before obtaining a database.",
      );
    }

    // If a connection to this database already exists, we reuse it.
    if (!this.connections[dbName]) {
      this.connections[dbName] = this.client.db(dbName);
      console.log(`Connection created for database: ${dbName}`);
    }

    return this.connections[dbName];
  }

  getClient() {
    if (!this.client) {
      throw new Error(
        "You must connect to the server before obtaining the client.",
      );
    }
    return this.client;
  }

  async closeAllConnections() {
    if (this.client) {
      await this.client.close();
      this.connections = {};
      this.client = null;
      console.log("All connections to MongoDB have been closed.");
    }
  }
}

// We export a single instance of the connection manager
const mongoDBConnectionManager = new MongoDBConnectionManager();
module.exports = mongoDBConnectionManager;
