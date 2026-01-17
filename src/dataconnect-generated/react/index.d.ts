import { CreateNewTournamentData, CreateNewTournamentVariables, ListTournamentsData, JoinTournamentData, JoinTournamentVariables, GetMyGamesData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateNewTournament(options?: useDataConnectMutationOptions<CreateNewTournamentData, FirebaseError, CreateNewTournamentVariables>): UseDataConnectMutationResult<CreateNewTournamentData, CreateNewTournamentVariables>;
export function useCreateNewTournament(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewTournamentData, FirebaseError, CreateNewTournamentVariables>): UseDataConnectMutationResult<CreateNewTournamentData, CreateNewTournamentVariables>;

export function useListTournaments(options?: useDataConnectQueryOptions<ListTournamentsData>): UseDataConnectQueryResult<ListTournamentsData, undefined>;
export function useListTournaments(dc: DataConnect, options?: useDataConnectQueryOptions<ListTournamentsData>): UseDataConnectQueryResult<ListTournamentsData, undefined>;

export function useJoinTournament(options?: useDataConnectMutationOptions<JoinTournamentData, FirebaseError, JoinTournamentVariables>): UseDataConnectMutationResult<JoinTournamentData, JoinTournamentVariables>;
export function useJoinTournament(dc: DataConnect, options?: useDataConnectMutationOptions<JoinTournamentData, FirebaseError, JoinTournamentVariables>): UseDataConnectMutationResult<JoinTournamentData, JoinTournamentVariables>;

export function useGetMyGames(options?: useDataConnectQueryOptions<GetMyGamesData>): UseDataConnectQueryResult<GetMyGamesData, undefined>;
export function useGetMyGames(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyGamesData>): UseDataConnectQueryResult<GetMyGamesData, undefined>;
