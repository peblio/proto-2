import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import ReactHtmlParser from 'react-html-parser';

import GoogleLoginButton from '../../shared/GoogleLoginButton/GoogleLoginButton.jsx';

require('./login.scss');

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNotice: false,
      notice: ''
    };
    this.loginSuccessful = this.loginSuccessful.bind(this);
    this.loginFailed = this.loginFailed.bind(this);
  }

  componentWillUnmount() {
    this.props.authLoadedPage();
  }

  loginFailed(error) {
    this.setState({
      showNotice: true,
      notice: error.response.data.msg
    });
  }

  loginSuccessful(response) {
    this.props.setUserName(response.data.user.name);
    this.props.setUserType(response.data.user.type);
    this.props.closeLoginModal();
  }

  submitLoginUser(event, name, password) {
    axios.post('/users/login', {
      name,
      password
    })
      .then(this.loginSuccessful)
      .catch(this.loginFailed);
    event.preventDefault();
  }

  render() {
    return (
      <div className="login-modal__content">
        <h1 className="login-modal__title">Log In</h1>
        <form onSubmit={(event) => { this.submitLoginUser(event, this.userName.value, this.userPassword.value); }}>
          <div className="login-modal__div">
            <input
              id="login-modal-name"
              className="login-modal__input"
              type="email"
              placeholder="email"
              ref={(userName) => { this.userName = userName; }}
            />
          </div>
          <div className="login-modal__div">
            <input
              id="login-modal-password"
              className="login-modal__input"
              type="password"
              placeholder="password"
              ref={(userPassword) => { this.userPassword = userPassword; }}
            />
          </div>

          <div className="login-modal__buttonholder">
            <button
              className="login-modal__link"
              onClick={() => {
                this.props.viewForgotModal();
                this.props.closeLoginModal();
              }}
            >
            forgot password?
            </button>
            <button className="forgot-modal__button" type="submit" value="Submit" >
              Submit
            </button>
          </div>
        </form>

        <GoogleLoginButton
          onLoginSuccess={this.loginSuccessful}
          onLoginFailure={this.loginFailed}
        />

        {this.state.showNotice &&
          <p className="forgot-modal__notice">
            {ReactHtmlParser(this.state.notice)}
          </p>
        }
      </div>
    );
  }

}

Login.propTypes = {
  authLoadedPage: PropTypes.func.isRequired,
  closeLoginModal: PropTypes.func.isRequired,
  setUserName: PropTypes.func.isRequired,
  setUserType: PropTypes.func.isRequired,
  viewForgotModal: PropTypes.func.isRequired
};

export default Login;