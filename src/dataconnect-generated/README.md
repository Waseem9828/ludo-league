# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListTournaments*](#listtournaments)
  - [*GetMyGames*](#getmygames)
- [**Mutations**](#mutations)
  - [*CreateNewTournament*](#createnewtournament)
  - [*JoinTournament*](#jointournament)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListTournaments
You can execute the `ListTournaments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTournaments(): QueryPromise<ListTournamentsData, undefined>;

interface ListTournamentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTournamentsData, undefined>;
}
export const listTournamentsRef: ListTournamentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTournaments(dc: DataConnect): QueryPromise<ListTournamentsData, undefined>;

interface ListTournamentsRef {
  ...
  (dc: DataConnect): QueryRef<ListTournamentsData, undefined>;
}
export const listTournamentsRef: ListTournamentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTournamentsRef:
```typescript
const name = listTournamentsRef.operationName;
console.log(name);
```

### Variables
The `ListTournaments` query has no variables.
### Return Type
Recall that executing the `ListTournaments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTournamentsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListTournamentsData {
  tournaments: ({
    id: UUIDString;
    name: string;
    startDate: DateString;
    endDate?: DateString | null;
    description?: string | null;
  } & Tournament_Key)[];
}
```
### Using `ListTournaments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTournaments } from '@dataconnect/generated';


// Call the `listTournaments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTournaments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTournaments(dataConnect);

console.log(data.tournaments);

// Or, you can use the `Promise` API.
listTournaments().then((response) => {
  const data = response.data;
  console.log(data.tournaments);
});
```

### Using `ListTournaments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTournamentsRef } from '@dataconnect/generated';


// Call the `listTournamentsRef()` function to get a reference to the query.
const ref = listTournamentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTournamentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tournaments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tournaments);
});
```

## GetMyGames
You can execute the `GetMyGames` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyGames(): QueryPromise<GetMyGamesData, undefined>;

interface GetMyGamesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyGamesData, undefined>;
}
export const getMyGamesRef: GetMyGamesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyGames(dc: DataConnect): QueryPromise<GetMyGamesData, undefined>;

interface GetMyGamesRef {
  ...
  (dc: DataConnect): QueryRef<GetMyGamesData, undefined>;
}
export const getMyGamesRef: GetMyGamesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyGamesRef:
```typescript
const name = getMyGamesRef.operationName;
console.log(name);
```

### Variables
The `GetMyGames` query has no variables.
### Return Type
Recall that executing the `GetMyGames` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyGamesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMyGames`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyGames } from '@dataconnect/generated';


// Call the `getMyGames()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyGames();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyGames(dataConnect);

console.log(data.playerGameStatss);

// Or, you can use the `Promise` API.
getMyGames().then((response) => {
  const data = response.data;
  console.log(data.playerGameStatss);
});
```

### Using `GetMyGames`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyGamesRef } from '@dataconnect/generated';


// Call the `getMyGamesRef()` function to get a reference to the query.
const ref = getMyGamesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyGamesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.playerGameStatss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.playerGameStatss);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateNewTournament
You can execute the `CreateNewTournament` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewTournament(vars: CreateNewTournamentVariables): MutationPromise<CreateNewTournamentData, CreateNewTournamentVariables>;

interface CreateNewTournamentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewTournamentVariables): MutationRef<CreateNewTournamentData, CreateNewTournamentVariables>;
}
export const createNewTournamentRef: CreateNewTournamentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewTournament(dc: DataConnect, vars: CreateNewTournamentVariables): MutationPromise<CreateNewTournamentData, CreateNewTournamentVariables>;

interface CreateNewTournamentRef {
  ...
  (dc: DataConnect, vars: CreateNewTournamentVariables): MutationRef<CreateNewTournamentData, CreateNewTournamentVariables>;
}
export const createNewTournamentRef: CreateNewTournamentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewTournamentRef:
```typescript
const name = createNewTournamentRef.operationName;
console.log(name);
```

### Variables
The `CreateNewTournament` mutation requires an argument of type `CreateNewTournamentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewTournamentVariables {
  name: string;
  startDate: DateString;
  createdAt: TimestampString;
}
```
### Return Type
Recall that executing the `CreateNewTournament` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewTournamentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewTournamentData {
  tournament_insert: Tournament_Key;
}
```
### Using `CreateNewTournament`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewTournament, CreateNewTournamentVariables } from '@dataconnect/generated';

// The `CreateNewTournament` mutation requires an argument of type `CreateNewTournamentVariables`:
const createNewTournamentVars: CreateNewTournamentVariables = {
  name: ..., 
  startDate: ..., 
  createdAt: ..., 
};

// Call the `createNewTournament()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewTournament(createNewTournamentVars);
// Variables can be defined inline as well.
const { data } = await createNewTournament({ name: ..., startDate: ..., createdAt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewTournament(dataConnect, createNewTournamentVars);

console.log(data.tournament_insert);

// Or, you can use the `Promise` API.
createNewTournament(createNewTournamentVars).then((response) => {
  const data = response.data;
  console.log(data.tournament_insert);
});
```

### Using `CreateNewTournament`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewTournamentRef, CreateNewTournamentVariables } from '@dataconnect/generated';

// The `CreateNewTournament` mutation requires an argument of type `CreateNewTournamentVariables`:
const createNewTournamentVars: CreateNewTournamentVariables = {
  name: ..., 
  startDate: ..., 
  createdAt: ..., 
};

// Call the `createNewTournamentRef()` function to get a reference to the mutation.
const ref = createNewTournamentRef(createNewTournamentVars);
// Variables can be defined inline as well.
const ref = createNewTournamentRef({ name: ..., startDate: ..., createdAt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewTournamentRef(dataConnect, createNewTournamentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.tournament_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.tournament_insert);
});
```

## JoinTournament
You can execute the `JoinTournament` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
joinTournament(vars: JoinTournamentVariables): MutationPromise<JoinTournamentData, JoinTournamentVariables>;

interface JoinTournamentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: JoinTournamentVariables): MutationRef<JoinTournamentData, JoinTournamentVariables>;
}
export const joinTournamentRef: JoinTournamentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
joinTournament(dc: DataConnect, vars: JoinTournamentVariables): MutationPromise<JoinTournamentData, JoinTournamentVariables>;

interface JoinTournamentRef {
  ...
  (dc: DataConnect, vars: JoinTournamentVariables): MutationRef<JoinTournamentData, JoinTournamentVariables>;
}
export const joinTournamentRef: JoinTournamentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the joinTournamentRef:
```typescript
const name = joinTournamentRef.operationName;
console.log(name);
```

### Variables
The `JoinTournament` mutation requires an argument of type `JoinTournamentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface JoinTournamentVariables {
  tournamentId: UUIDString;
  userId_expr: string;
}
```
### Return Type
Recall that executing the `JoinTournament` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `JoinTournamentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface JoinTournamentData {
  tournamentParticipant_insert: TournamentParticipant_Key;
}
```
### Using `JoinTournament`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, joinTournament, JoinTournamentVariables } from '@dataconnect/generated';

// The `JoinTournament` mutation requires an argument of type `JoinTournamentVariables`:
const joinTournamentVars: JoinTournamentVariables = {
  tournamentId: ..., 
  userId_expr: ..., 
};

// Call the `joinTournament()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await joinTournament(joinTournamentVars);
// Variables can be defined inline as well.
const { data } = await joinTournament({ tournamentId: ..., userId_expr: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await joinTournament(dataConnect, joinTournamentVars);

console.log(data.tournamentParticipant_insert);

// Or, you can use the `Promise` API.
joinTournament(joinTournamentVars).then((response) => {
  const data = response.data;
  console.log(data.tournamentParticipant_insert);
});
```

### Using `JoinTournament`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, joinTournamentRef, JoinTournamentVariables } from '@dataconnect/generated';

// The `JoinTournament` mutation requires an argument of type `JoinTournamentVariables`:
const joinTournamentVars: JoinTournamentVariables = {
  tournamentId: ..., 
  userId_expr: ..., 
};

// Call the `joinTournamentRef()` function to get a reference to the mutation.
const ref = joinTournamentRef(joinTournamentVars);
// Variables can be defined inline as well.
const ref = joinTournamentRef({ tournamentId: ..., userId_expr: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = joinTournamentRef(dataConnect, joinTournamentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.tournamentParticipant_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.tournamentParticipant_insert);
});
```

