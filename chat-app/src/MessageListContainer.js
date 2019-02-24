import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React from 'react';
import {library} from '@fortawesome/fontawesome-svg-core';
import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';

library.add(faExclamationTriangle);

const MessageListContainer = ({messages, isMessagesError}) =>
    isMessagesError ?
        <MessagesError/> :
        <MessageList messages={messages}/>;

const MessagesError = () =>
    <div className={'MessageListError'}>
        <p>
            <FontAwesomeIcon icon="exclamation-triangle"/>
            <span> failed to load messages</span>
        </p>
    </div>;

const MessageList = ({messages = []}) => {
    if (messages.length === 0) {
        return <MessageListEmpty/>
    } else {
        const createMessageElement = (message, index) =>
            <p key={index}
               className={"message"}>
                {message.text}
            </p>;
        return <div id="messageList">
            {messages.map(createMessageElement)}
        </div>;
    }
};

const MessageListEmpty = () =>
    <div className={'MessageListEmpty'}>
        <p>there are no messages</p>
    </div>;

export default MessageListContainer;