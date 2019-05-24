const Schema = require("truffle-contract-schema");
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
const debug = require("debug")("artifactor");

class Artifactor {
  constructor(destination) {
    this.destination = destination;
  }

  async save(artifactObject) {
    const normalizedNewArtifact = Schema.normalize(artifactObject);
    const contractName = normalizedNewArtifact.contractName;

    if (!contractName) throw new Error("You must specify a contract name.");

    const output_path = path.join(this.destination, `${contractName}.json`);

    // private helper for writing artifacts
    const writeArtifact = _completeArtifact => {
      _completeArtifact.updatedAt = new Date().toISOString();
      fs.writeFileSync(
        output_path,
        JSON.stringify(_completeArtifact, null, 2),
        "utf8"
      );
    };

    try {
      const existingArtifact = fs.readFileSync(output_path, "utf8"); // check if artifact already exists
      const existingArtifactObject = JSON.parse(existingArtifact); // parse existing artifact
      const normalizedExistingArtifact = Schema.normalize(
        existingArtifactObject
      );

      const knownNetworks = _.merge(
        {},
        normalizedExistingArtifact.networks,
        normalizedNewArtifact.networks
      );
      const completeArtifact = _.assign(
        {},
        normalizedExistingArtifact,
        normalizedNewArtifact,
        { networks: knownNetworks }
      );
      writeArtifact(completeArtifact);
    } catch (e) {
      // if artifact doesn't already exist, write new file
      if (e.code === "ENOENT") return writeArtifact(normalizedNewArtifact);
      else if (e instanceof SyntaxError) throw e; // catches improperly formatted artifact json
      throw e; // catch all other errors
    }
  }

  async saveAll(artifactObjects) {
    let newArtifactObjects = {};

    if (Array.isArray(artifactObjects)) {
      const tmpArtifactArray = artifactObjects;

      tmpArtifactArray.forEach(artifactObj => {
        newArtifactObjects[artifactObj.contract_name] = artifactObj;
      });
    } else {
      newArtifactObjects = artifactObjects;
    }

    try {
      fs.statSync(this.destination); // check if destination exists
    } catch (e) {
      if (e.code === "ENOENT")
        // if destination doesn't exist, throw error
        throw new Error(`Destination "${this.destination}" doesn't exist!`);
      throw e; // throw on all other errors
    }

    Object.keys(newArtifactObjects).forEach(contractName => {
      let artifactObject = newArtifactObjects[contractName];
      this.save(artifactObject);
    });
  }
}

module.exports = Artifactor;
