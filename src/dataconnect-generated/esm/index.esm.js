import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'studio',
  location: 'us-east4'
};

export const createNewTournamentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewTournament', inputVars);
}
createNewTournamentRef.operationName = 'CreateNewTournament';

export function createNewTournament(dcOrVars, vars) {
  return executeMutation(createNewTournamentRef(dcOrVars, vars));
}

export const listTournamentsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTournaments');
}
listTournamentsRef.operationName = 'ListTournaments';

export function listTournaments(dc) {
  return executeQuery(listTournamentsRef(dc));
}

export const joinTournamentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'JoinTournament', inputVars);
}
joinTournamentRef.operationName = 'JoinTournament';

export function joinTournament(dcOrVars, vars) {
  return executeMutation(joinTournamentRef(dcOrVars, vars));
}

export const getMyGamesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyGames');
}
getMyGamesRef.operationName = 'GetMyGames';

export function getMyGames(dc) {
  return executeQuery(getMyGamesRef(dc));
}

