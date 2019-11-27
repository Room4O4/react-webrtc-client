import React from 'react';
import SocketContext from '../../contexts/SocketContext';
import DataChannelTypes from '../../enums/DataChannelTypes';
import PeerTypes from '../../enums/PeerTypes';

const withPeerConnection = WrappedComponent => {
  class PeerConnection extends React.Component {
    state = {
      files: null,
      incomingFileInfo: null
    };

    constructor(props) {
      super(props);
      this.peerConnection = null;
      this.dataChannel = null;
    }

    componentDidMount() {
      // Webrtc signalling message listeners
      this.context.socket.on('offer', this.onOfferReceived);
      this.context.socket.on('answer', this.onAnswerReceived);
      this.context.socket.on('candidate', this.onCandidateReceived);

      this.context.socket.on('fileInfo', this.onFileInfoReceived);
      this.context.socket.on('ready', this.onPeerReadyForDataTransfer);
    }

    // RTCPeerConnection management methods.

    setupPeerConnectionForDataTransfer = async () => {
      try {
        this.createPeerConnection();
        if (this.context.peerType === PeerTypes.SENDER) {
          this.createDataChannel(DataChannelTypes.SEND);
          await this.createAndSendOffer();
        } else {
          this.createDataChannel(DataChannelTypes.RECEIVE);
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    };

    teardownPeerConnection = () => {
      this.dataChannel.close();
      this.peerConnection.close();
      this.dataChannel = null;
      this.peerConnection = null;
    };

    createPeerConnection = () => {
      console.log('Creating peer connection');
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302'
          }
        ]
      });
      peerConnection.onicecandidate = iceCandidate => {
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
      this.peerConnection = peerConnection;
    };

    createDataChannel = datachannelType => {
      if (datachannelType === DataChannelTypes.SEND) {
        console.log('Create sendDataChannel');
        const sendChannel = this.peerConnection.createDataChannel(
          'sendDataChannel'
        );
        console.log('Created sendDataChannel', sendChannel);
        sendChannel.onopen = this.onSendChannelOpen;
        sendChannel.onclose = this.onSendChannelClose;
        this.dataChannel = sendChannel;
      } else if (datachannelType === DataChannelTypes.RECEIVE) {
        console.log('Setting listener for ondatachannel');
        this.peerConnection.ondatachannel = event => {
          console.log('ReceiveDataChannel event triggered');
          const receiveChannel = event.channel;
          receiveChannel.onmessage = this.onReceiveMessage;
          receiveChannel.onopen = this.onReceiveChannelOpen;
          receiveChannel.onclose = this.onReceiveChannelClose;
          this.dataChannel = receiveChannel;
        };
      }
    };

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

    sendOffer = offer => {
      console.log('Sending offer', this.context.room, offer);
      this.context.socket.emit(
        'offer',
        this.context.room,
        this.props.peerId,
        offer
      );
    };

    sendCandidate = candidate => {
      console.log('Sending candidate', this.context.room, candidate);
      this.context.socket.emit(
        'candidate',
        this.context.room,
        this.props.peerId,
        candidate
      );
    };

    sendAnswer = answer => {
      console.log('Sending answer', this.context.room, answer);
      this.context.socket.emit(
        'answer',
        this.context.room,
        this.props.peerId,
        answer
      );
    };

    // RTCPeerConnection signalling callback handlers

    onOfferReceived = async (targetPeer, desc) => {
      if (targetPeer === this.context.myId) {
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
      }
    };

    onAnswerReceived = async (targetPeer, desc) => {
      if (targetPeer === this.context.myId) {
        console.log('Answer received', desc);
        await this.peerConnection.setRemoteDescription(desc);
      }
    };

    onCandidateReceived = async (targetPeer, iceCandidate) => {
      if (targetPeer === this.context.myId) {
        try {
          console.log('Candidate received', iceCandidate);
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
      }
    };

    // Callback handlers for other methods.

    onFileInfoReceived = (targetPeer, fileInfo) => {
      if (targetPeer === this.context.myId) {
        console.log('File info received', fileInfo);
        this.setState({
          incomingFileInfo: fileInfo
        });
        // TODO: Implement conditional file transfer here if needed.

        this.setupPeerConnectionForDataTransfer();
        this.context.socket.emit('ready', this.context.room, this.props.peerId);
      }
    };

    onPeerReadyForDataTransfer = targetPeer => {
      if (targetPeer === this.context.myId) {
        console.log('Peer is ready');

        this.setupPeerConnectionForDataTransfer();
      }
    };

    // WebRTC DataChannel callback handler methods

    onReceiveMessage = event => {
      console.log('onReceiveMessage', event.data);
      this.downloadBlob(event.data, this.state.incomingFileInfo.name);
      this.teardownPeerConnection();
    };

    onReceiveChannelOpen = event => {
      console.log('onReceiveChannelOpen', event);
    };

    onReceiveChannelClose = event => {
      console.log('onReceiveChannelClose', event);
    };

    onSendChannelOpen = event => {
      console.log('onSendChannelOpen', event);
      this.dataChannel.send(this.state.files[0]);
    };

    onSendChannelClose = event => {
      console.log('onSendChannelClose', event);
      this.teardownPeerConnection();
    };

    // Util methods

    downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      a.click();
    };

    sendFiles = files => {
      this.setState({
        files
      });
      this.sendFileInfo(files);
    };

    sendFileInfo = files => {
      const fileInfo = {
        name: files[0].name,
        size: files[0].size
      };
      this.context.socket.emit(
        'fileInfo',
        this.context.room,
        this.props.peerId,
        fileInfo
      );
    };

    render() {
      return <WrappedComponent {...this.props} sendFiles={this.sendFiles} />;
    }
  }
  PeerConnection.contextType = SocketContext;

  return PeerConnection;
};

export default withPeerConnection;
