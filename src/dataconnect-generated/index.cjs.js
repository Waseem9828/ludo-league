const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'studio',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const createNewTournamentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewTournament', inputVars);
}
createNewTournamentRef.operationName = 'CreateNewTournament';
exports.createNewTournamentRef = createNewTournamentRef;

exports.createNewTournament = function createNewTournament(dcOrVars, vars) {
  return executeMutation(createNewTournamentRef(dcOrVars, vars));
};

const listTournamentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTournaments');
}
listTournamentsRef.operationName = 'ListTournaments';
exports.listTournamentsRef = listTournamentsRef;

exports.listTournaments = function listTournaments(dc) {
  return executeQuery(listTournamentsRef(dc));
};

const joinTournamentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'JoinTournament', inputVars);
}
joinTournamentRef.operationName = 'JoinTournament';
exports.joinTournamentRef = joinTournamentRef;

exports.joinTournament = function joinTournament(dcOrVars, vars) {
  return executeMutation(joinTournamentRef(dcOrVars, vars));
};

const getMyGamesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyGames');
}
getMyGamesRef.operationName = 'GetMyGames';
exports.getMyGamesRef = getMyGamesRef;

exports.getMyGames = function getMyGames(dc) {
  return executeQuery(getMyGamesRef(dc));
};
