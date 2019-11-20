import React from 'react';
import io from 'socket.io-client';

import ConnectionStates from '../../enums/ConnectionStates';
import DataChannelTypes from '../../enums/DataChannelTypes';
import AppConstants from '../../utils/AppConstants';

const withConnection = WrappedComponent =>
  class Connection extends React.Component {
    // Component Lifecycle methods
    constructor(props) {
      super();

      this.socket = null;
      this.peerConnection = null;
      this.dataChannel = null;

      this.state = {
        peers: [],
        connectionState: ConnectionStates.NOT_JOINED,
        room: null,
        myId: null,
        peerConnection: null,
        dataChannel: null
      };
    }

    componentDidMount() {
      // Initialize socket connection
      this.socket = io(AppConstants.SOCKET_SERVER_URI);

      // Socket connection listeners
      this.socket.on('connect', this.onSocketConnected);
      this.socket.on('disconnect', this.onSocketDisconnected);

      // Listeners for room
      this.socket.on('joined', this.handleRoomJoinSuccess);
      this.socket.on('roommate', this.handleNewRoommate);

      // Webrtc signalling message listeners
      this.socket.on('offer', this.onOfferReceived);
      this.socket.on('answer', this.onAnswerReceived);
      this.socket.on('candidate', this.onCandidateReceived);
    }

    componentWillUnmount() {
      this.socket.disconnect();
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
      this.createPeerConnection();
      if (existingPeers && existingPeers.length === 2) {
        this.createDataChannel(DataChannelTypes.RECEIVE);
      } else {
        this.createDataChannel(DataChannelTypes.SEND);
      }
      this.setState({
        connectionState: ConnectionStates.JOINED,
        room: room,
        myId: id,
        peers: existingPeers
          ? existingPeers.filter(peerId => peerId !== id)
          : []
      });
    };

    handleNewRoommate = async (room, id) => {
      try {
        console.log('New roommate', room, id);
        await this.createAndSendOffer();
        this.setState({
          peers: [...this.state.peers, id]
        });
      } catch (error) {
        console.log(error);
      }
    };

    onOfferReceived = async desc => {
      console.log('Offer received', desc);
      try {
        await this.peerConnection.setRemoteDescription(desc);
        await this.peerConnection.setLocalDescription(
          await this.peerConnection.createAnswer()
        );
        this.sendAnswer(this.peerConnection.localDescription);
      } catch (error) {
        console.log(error);
      }
    };

    onAnswerReceived = async desc => {
      console.log('Answer received', desc);
      await this.peerConnection.setRemoteDescription(desc);
    };

    onCandidateReceived = async iceCandidate => {
      try {
        console.log('Candidate received', iceCandidate);
        // await this.peerConnection.addIceCandidate(iceCandidate);
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate({
            candidate: iceCandidate.candidate.candidate,
            sdpMid: iceCandidate.candidate.sdpMid,
            sdpMLineIndex: iceCandidate.candidate.sdpMLineIndex,
            usernameFragment: iceCandidate.candidate.userNameFragment
          })
        );
      } catch (error) {
        console.log(error);
      }
    };

    // WebRTC signalling helper methods

    createAndSendOffer = async () => {
      try {
        // Without sending offerToReceiveAudio or offerToReceiveVideo in the offer config,
        // SDP is not getting set properly
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await this.peerConnection.setLocalDescription(offer);
        this.sendOffer(offer);
      } catch (error) {
        console.log(error);
      }
    };

    createDataChannel = datachannelType => {
      if (datachannelType === DataChannelTypes.SEND) {
        console.log('Create sendDataChannel');
        const sendChannel = this.peerConnection.createDataChannel(
          'sendDataChannel'
        );
        this.dataChannel = sendChannel;
      } else if (datachannelType === DataChannelTypes.RECEIVE) {
        this.peerConnection.ondatachannel = event => {
          console.log('ReceiveDataChannel event triggered');
          const receiveChannel = event.channel;
          receiveChannel.onmessage = this.onReceiveMessage;
          receiveChannel.onopen = this.onReceiveChannelStateChange;
          receiveChannel.onclose = this.onReceiveChannelStateChange;
          this.dataChannel = receiveChannel;
        };
      }
    };

    createPeerConnection = () => {
      console.log('Creating peer connection');
      this.peerConnection = new RTCPeerConnection();
      this.peerConnection.onicecandidate = iceCandidate => {
        if (iceCandidate.candidate === null) {
          console.log('Candidate discovery ended');
        } else {
          console.log('Candidate discovered', iceCandidate);

          // socket.io-client seem to enumerate iceCandidate object internally.
          // All non-enumerable properties are getting ignored while emitting event.
          // Hence we need to manually construct a new object and send.

          this.sendCandidate({
            candidate: iceCandidate.candidate,
            sdpMid: iceCandidate.sdpMid,
            sdpMLineIndex: iceCandidate.sdpMLineIndex,
            userNameFragment: iceCandidate.userNameFragment
          });
        }
      };
    };

    sendOffer = offer => {
      console.log('Sending offer', this.state.room, offer);
      this.socket.emit('offer', this.state.room, offer);
    };

    sendCandidate = candidate => {
      console.log('Sending candidate', this.state.room, candidate);
      this.socket.emit('candidate', this.state.room, candidate);
    };

    sendAnswer = answer => {
      console.log('Sending answer', this.state.room, answer);
      this.socket.emit('answer', this.state.room, answer);
    };

    // DataChannel callbacks

    onReceiveMessage = event => {
      console.log('onReceiveMessage', event.data);
    };

    onReceiveChannelStateChange = event => {
      console.log('onReceiveChannelStateChange', event);
    };

    // Child component prop methods

    joinRoom = roomName => {
      this.socket.emit('join', roomName);
    };

    sendData = data => {
      this.dataChannel.send(data);
    };

    render() {
      return (
        <WrappedComponent
          {...this.state}
          joinRoom={this.joinRoom}
          sendData={this.sendData}
        />
      );
    }
  };

export default withConnection;
