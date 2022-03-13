const ACME = artifacts.require("ACME");

module.exports = function(deployer) {
  deployer.deploy(ACME);
};
