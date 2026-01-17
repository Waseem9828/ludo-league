import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateNewTournamentData {
  tournament_insert: Tournament_Key;
}

export interface CreateNewTournamentVariables {
  name: string;
  startDate: DateString;
  createdAt: TimestampString;
}

export interface Game_Key {
  id: UUIDString;
  __typename?: 'Game_Key';
}

export interface GetMyGamesData {
  playerGameStatss: ({
    id: UUIDString;
    score: number;
    position: number;
    game: {
      id: UUIDString;
      gameDate: DateString;
    } & Game_Key;
  } & PlayerGameStats_Key)[];
}

export interface JoinTournamentData {
  tournamentParticipant_insert: TournamentParticipant_Key;
}

export interface JoinTournamentVariables {
  tournamentId: UUIDString;
  userId_expr: string;
}

export interface ListTournamentsData {
  tournaments: ({
    id: UUIDString;
    name: string;
    startDate: DateString;
    endDate?: DateString | null;
    description?: string | null;
  } & Tournament_Key)[];
}

export interface PlayerGameStats_Key {
  id: UUIDString;
  __typename?: 'PlayerGameStats_Key';
}

export interface TournamentParticipant_Key {
  userId: UUIDString;
  tournamentId: UUIDString;
  __typename?: 'TournamentParticipant_Key';
}

export interface Tournament_Key {
  id: UUIDString;
  __typename?: 'Tournament_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateNewTournamentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewTournamentVariables): MutationRef<CreateNewTournamentData, CreateNewTournamentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewTournamentVariables): MutationRef<CreateNewTournamentData, CreateNewTournamentVariables>;
  operationName: string;
}
export const createNewTournamentRef: CreateNewTournamentRef;

export function createNewTournament(vars: CreateNewTournamentVariables): MutationPromise<CreateNewTournamentData, CreateNewTournamentVariables>;
export function createNewTournament(dc: DataConnect, vars: CreateNewTournamentVariables): MutationPromise<CreateNewTournamentData, CreateNewTournamentVariables>;

interface ListTournamentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTournamentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTournamentsData, undefined>;
  operationName: string;
}
export const listTournamentsRef: ListTournamentsRef;

export function listTournaments(): QueryPromise<ListTournamentsData, undefined>;
export function listTournaments(dc: DataConnect): QueryPromise<ListTournamentsData, undefined>;

interface JoinTournamentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: JoinTournamentVariables): MutationRef<JoinTournamentData, JoinTournamentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: JoinTournamentVariables): MutationRef<JoinTournamentData, JoinTournamentVariables>;
  operationName: string;
}
export const joinTournamentRef: JoinTournamentRef;

export function joinTournament(vars: JoinTournamentVariables): MutationPromise<JoinTournamentData, JoinTournamentVariables>;
export function joinTournament(dc: DataConnect, vars: JoinTournamentVariables): MutationPromise<JoinTournamentData, JoinTournamentVariables>;

interface GetMyGamesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyGamesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyGamesData, undefined>;
  operationName: string;
}
export const getMyGamesRef: GetMyGamesRef;

export function getMyGames(): QueryPromise<GetMyGamesData, undefined>;
export function getMyGames(dc: DataConnect): QueryPromise<GetMyGamesData, undefined>;

