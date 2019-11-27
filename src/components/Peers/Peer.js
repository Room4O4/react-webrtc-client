import React from 'react';
import faker from 'faker';
import { withStyles } from '@material-ui/core/styles';
import { Typography, Grid, Button } from '@material-ui/core';
import styles from './Peer.css';
import PeerTypes from '../../enums/PeerTypes';
import SocketContext from '../../contexts/SocketContext';

class Peer extends React.Component {
  constructor(props) {
    super(props);
    this.fileInputRef = React.createRef();
  }

  handleFormSubmit = event => {
    event.preventDefault();
    this.props.sendFiles(this.fileInputRef.current.files);
  };

  loadSendButton = () => {
    const { classes } = this.props;
    return (
      <form onSubmit={this.handleFormSubmit}>
        <Grid container direction="column" justify="center" alignItems="center">
          <Grid item xs={6}>
            <input name="file" type="file" ref={this.fileInputRef} />
          </Grid>
          <Grid item xs={2}>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              type="submit"
            >
              Send
            </Button>
          </Grid>
        </Grid>
      </form>
    );
  };

  render() {
    const { classes } = this.props;
    return (
      <Grid container direction="column" justify="center" alignItems="center">
        <Grid item>
          <img
            alt="Avatar"
            className={classes.image}
            src={faker.image.avatar()}
          ></img>
          <Typography>{faker.name.firstName()}</Typography>
          {this.props.peerType && this.props.peerType === PeerTypes.SENDER
            ? this.loadSendButton()
            : null}
        </Grid>
      </Grid>
    );
  }
}

Peer.contextType = SocketContext;

export default withStyles(styles)(Peer);
