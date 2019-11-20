import React from 'react';
import Home from './Home/Home';
import withConnection from './SocketConnection/withConnection';

const App = () => {
    const HomeWithConnection = withConnection(Home);
    return <HomeWithConnection/>
}

export default App;