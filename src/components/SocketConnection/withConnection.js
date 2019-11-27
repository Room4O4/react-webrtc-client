import React from 'react';
import io from 'socket.io-client';

import ConnectionStates from '../../enums/ConnectionStates';
import AppConstants from '../../utils/AppConstants';
import PeerTypes from '../../enums/PeerTypes';

import SocketContext from '../../contexts/SocketContext';

const withConnection = WrappedComponent =>
  class Connection extends React.Component {
    state = {
      socket: null,
      peers: [],
      connectionState: ConnectionStates.NOT_JOINED,
      room: null,
      myId: null,
      peerType: null
    };

    // Component Lifecycle methods

    componentDidMount() {
      // Initialize socket connection
      const socket = io(AppConstants.SOCKET_SERVER_URI);

      // Socket connection listeners
      socket.on('connect', this.onSocketConnected);
      socket.on('disconnect', this.onSocketDisconnected);

      // Listeners for room
      socket.on('joined', this.handleRoomJoinSuccess);
      socket.on('roommate', this.handleNewRoommate);

      this.setState({
        socket
      });
    }

    componentWillUnmount() {
      this.state.socket.disconnect();
    }

    // socket.io-client callbacks/handlers

    onSocketConnected = () => {
      console.log('Socket connected');
    };

    onSocketDisconnected = () => {
      console.log('Socket disconnected');
    };

    handleRoomJoinSuccess = (room, id, existingPeers) => {
      console.log('Joined', room, id, existingPeers);
      this.setState({
        connectionState: ConnectionStates.JOINED,
        room: room,
        myId: id,
        peers: existingPeers
          ? existingPeers.filter(peerId => peerId !== id)
          : [],
        peerType: existingPeers ? PeerTypes.RECIPIENT : PeerTypes.SENDER
      });
    };

    handleNewRoommate = async (room, id) => {
      try {
        console.log('New roommate', room, id);
        this.setState({
          peers: [...this.state.peers, id]
        });
      } catch (error) {
        console.log(error);
      }
    };

    // Child component prop methods

    joinRoom = roomName => {
      this.state.socket.emit('join', roomName);
    };

    render() {
      return (
        <SocketContext.Provider value={this.state}>
          <WrappedComponent {...this.state} joinRoom={this.joinRoom} />
        </SocketContext.Provider>
      );
    }
  };

export default withConnection;
