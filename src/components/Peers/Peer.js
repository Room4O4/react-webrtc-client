import React from 'react';
import faker from 'faker';
import { withStyles } from '@material-ui/core/styles';
import { Typography, Grid } from '@material-ui/core';
import styles from './Peer.css';

const Peer = props => {
  const { classes } = props;
  return (
    <Grid container direction="column" justify="center" alignItems="center">
      <Grid item>
        <img
          alt="Avatar"
          className={classes.image}
          src={faker.image.avatar()}
        ></img>
        <Typography>{faker.name.firstName()}</Typography>
      </Grid>
    </Grid>
  );
};

export default withStyles(styles)(Peer);
