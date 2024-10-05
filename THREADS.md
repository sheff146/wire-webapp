# Conversation Threads Implementation Proposal

Currently, messages in Wire app are displayed in a single list and all replies (quotes) are appended to the end of the list. There is an idea to implement a threading concept where messages can have threads where replies are displayed in their own chain and not appended to the bottom of the list.

## Context

During short time investigation of the current messaging implementation, it was found that a client stores conversations and messages in a local database and don't fetch conversation history from the backend. There's a high probability that messages are not stored long-term on the backend at all. Messages come and leave the client encrypted. Messages are sent via REST API. Messages are received via a WebSocket connection established between the client and a server. After login or after the WebSocket connection interruption, the client performs a request to the backend to retrieve missed notifications, that's how it receives missed messages and updates. This is not performed after first login on a device.

The important conclusion from this is that **there is no guarantee that a client has or able to fetch any given message data**. This follows from the previous paragraph as well as from the MLS standard the system implements. In this standard a group participant doesn't have access to group keys when they weren't part of the group, hence can't access any messages sent during that period.

The quoting functionality in the app is implemented in a way that the information about a quoted message is assigned to a [designated field in a message event](./src/script/conversation/EventBuilder.ts#L137). A sender client fills it with a quoted message data. A conversation participant who receives such message with a quote can read that data and display the new message in a specific way. NOTE: Only quoted message metadata is attached, not the message content. It means that if the receiver is not able to access the quoted message, they won't be able to read its content, and it will be displayed in the UI as a quote of not accessible message.

## Requirements

DISCLAIMER: This list of requirements is based on the initial vague problem statement, limited knowledge of the system, and authors personal opinion on how such functionality should look and behave.

1. It should be possible to start a thread from any message in a conversation that is not part of a thread already.
2. Thread messages should be displayed in a separate side section. They shouldn't be displayed in the main conversation message list.
3. A message having a thread should be indicated in the message list with number of replies in a thread or at least it should be visible that there is a thread behind this message.
4. In a thread it should be possible to perform same actions with messages as in the main conversation: receive, send, delete, edit, react, mention, search, etc.
5. Currently stored message history should still be available for a client after introducing threads.
6. There should be as little confusion as possible for users with the introduction of threads, old messages should remain displayed as they were displayed before threads.
7. Threads should be backward compatible. If a client does not support threading functionality, it should still be possible to read messages sent to a thread by other clients. They should be displayed in the main conversation section.
8. If a client receives a message to a thread but the thread start message or some other messages in the thread are not available, it should be still possible to read the new message and display it as part of the thread.
9. OPTIONAL. Threads should be forward compatible. If a client that doesn't support threads quotes a message that is a part of a thread, it is displayed as part of a thread in clients that support threads.

## Implementation

After careful consideration of the system architecture, requirements, constraints, and possible solutions, one solution was identified as optimal. Other possible solutions are mentioned as well.

### Suggested solution

This solution requires adding a new optional field to the message data model: `threadStart`. Structured similar to `quote`, it would contain metadata of a thread start message. Messages not belonging to a thread would not have it set. All messages belonging to a certain thread would have it set the same: the thread start message metadata.

```typescript
export type MessageAddEvent = ConversationEvent<
  CONVERSATION.MESSAGE_ADD,
  {
    // ... other fields
    threadStart?: {
      message_id: string;
      user_id: string;
      hash: Uint8Array;
    };
  }
>;
```

This would allow starting a thread or replying to an existing one simply by sending a message with this field set. A client receiving such message should be able to store it in the same storage (IndexedDB table) together with other messages. It should be able to filter it out during fetching from the storage for displaying the conversation list, as well as indicate and highlight the thread start message in the conversation. It should be able to fetch the thread content upon opening it by filtering by this field from the storage. This paragraph covers the first six requirements.

Regarding requirement number seven, backward compatibility will be preserved as well. With the given implementation, new thread messages will be displayed as normal conversation messages for clients not supporting threads. However, one improvement could be done: when replying to a thread in new clients, the `quote` message field could be set with the same value as the `threadStart` field. New clients can ignore it for messages in a thread but it will give old clients users the ability to associate the new message with the thread start message. This is controversial and requires further discussion as obviously with this improvement it won't be possible to use quoting functionality in threads.

Requirement number nine could be fulfilled in a similar way. A client receiving a new message with a quote of a thread message can associate it with the thread. However, again, it adds limitations to quoting thread messages.

Regarding requirement number eight. If a client receives a new message and is not available to fetch the thread start message, it should display a stub thread start message in the main conversation with timestamp derived from the first available thread message. This way a user will be aware that there is a thread and the new message is part of it but there is no access to the full thread history.

#### Potential issues

The requirements say only about one level threads and doesn't say anything about a possibility to start recursive threads. In the authors opinion it is not needed and will bring unnecessary complications to the UI and to the technical implementation.

However, the suggested approach doesn't restrict from (accidental) linking to a message that is a part of a thread already. To eliminate possible issues, clients can implement additional checks after receiving a new message that a linked thread start message is not part of a thread already and if it is, "escalate" the new message to that thread. It is not a 100% guarantee but considering small probability of such situation, it looks acceptable.

#### Implementation and roll out

The feature can be implemented during some period of time in several clients (mobile, web, etc.) in parallel and then gradually enabled. It is not to the author knowledge if any back-end changes will be necessary, presumably not. From the task it is not completely clear whether threads should replace quoting or these two features should work in parallel, it can be both. Quoting is something different and can stay separately, however, if the product owner decides to remove it, it can be disabled and the code related to it can be first deprecated and then removed.

#### Other coniderations

This description touches only messages, however, there are probably other conversation events that has to be altered. For example, typing event. If someone types in a thread, it would be appropriate to display the typing status in the thread, not in the main conversation. In this case the typing event can be altered with `threadStartId` field aas well. There are probably more minor cases like like this and they should be indentified and discussed separately.

### Other considered options

There were more approaches considered but not selected for different reasons.

#### Reusing existing quote field

Instead of introducing a new field, the existing `quote` field could be reused but it would completely ruin how the older quoted messages would be displayed (requirement six). Also, quotes and threads are fundamentally different capabilities and rather shouldn't be mixed together or replaced one with another.

#### Creating a new conversation/subconversation for each thread

There is also a theoretical option of creating a new conversation for each thread but it would bring a tremendous overhead, both on a client and a server. The potential number of such subconversations is quite big because a new conversation can be started for every message. Then it will have to be stored and managed: participants list should be synchronized with the main conversation. Also, it would complicate the implementation of existing client features, such as search, where instead of searching just inside one conversation, subconversations should also be considered now.
