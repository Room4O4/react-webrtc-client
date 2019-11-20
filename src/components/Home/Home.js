import React from 'react';
import {
  Container,
  TextField,
  Button,
  Grid,
  Typography
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import Peer from '../Peers/Peer';

import styles from './Home.css.js';
import ConnectionStates from '../../enums/ConnectionStates.js';

class Home extends React.Component {
  state = { roomName: 'default' };

  handleJoinButtonClick = () => {
    this.props.joinRoom(this.state.roomName, this.state.userName);
  };

  handleSendButtonClick = () => {
    this.props.sendData('Hi. This is my first webRTC message');
  };

  handleRoomNameChange = event => {
    this.setState({
      roomName: event.target.value
    });
  };

  displayNotJoinedContent = () => {
    const { classes } = this.props;
    return (
      <Grid container justify="center" alignItems="center">
        <Grid item xs={2}>
          <form>
            <TextField
              id="roomName"
              label="Enter Room Name"
              margin="normal"
              onChange={this.handleRoomNameChange}
            />
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              onClick={this.handleJoinButtonClick}
            >
              Join
            </Button>
          </form>
        </Grid>
      </Grid>
    );
  };

  displayJoinedContent = () => {
    const { classes } = this.props;
    return (
      <Grid container direction="column" justify="center" alignItems="center">
        <Grid item xs={2}>
          <Typography> Peers in room {this.props.room}</Typography>
        </Grid>
        <Grid item xs={2}>
          <Grid container direction="row">
            {this.props.peers.map(peer => (
              <Peer key={peer} name={peer} />
            ))}
          </Grid>
        </Grid>
        <Grid item xs={2}>
          <Button
            className={classes.button}
            variant="contained"
            color="primary"
            onClick={this.handleSendButtonClick}
          >
            Send
          </Button>
        </Grid>
      </Grid>
    );
  };

  displayContent = () => {
    const { connectionState } = this.props;
    switch (connectionState) {
      case ConnectionStates.JOINED:
        return this.displayJoinedContent();
      case ConnectionStates.NOT_JOINED:
        return this.displayNotJoinedContent();
      default:
        return null;
    }
  };

  render() {
    const { classes } = this.props;
    return (
      <Container className={classes.container} fixed>
        {this.displayContent()}
      </Container>
    );
  }
}

export default withStyles(styles)(Home);
