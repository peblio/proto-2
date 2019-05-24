import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'react-tooltip-lite';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import UserAccount from '../../Shared/UserAccount/UserAccount.jsx';
import FileMenu from './FileMenu/FileMenu.jsx';
import HelpMenu from './HelpMenu/HelpMenu.jsx';
import Preferences from '../Preferences/Preferences.jsx';
import InsertToolbar from './InsertToolbar/InsertToolbar.jsx';
import ToolbarLogo from '../../../images/logo.svg';
import CheckSVG from '../../../images/check.svg';
import PreferencesSVG from '../../../images/preferences.svg';

import { createNavigationContent } from '../../../action/navigation.js';
import { logoutUser } from '../../../action/user.js';
import { setPageTitle, togglePreviewMode, autoSaveUnsavedChanges, savePageSnapshot } from '../../../action/page.js';
import * as mainToolbarActions from '../../../action/mainToolbar.js';

require('./mainToolbar.scss');

class MainToolbar extends React.Component {
  componentDidMount() {
    this.autoSaveTimeout = setInterval(() => {
      if (
        this.props.name && this.props.canEdit && this.props.unsavedChanges &&
        this.props.editorAutoSave && this.props.projectID()
      ) {
        this.props.autoSaveUnsavedChanges();
        this.props.createNavigationContent(this.props.layout);
        this.props.savePage();
      }
    }, 10000);
  }

  componentWillUnmount() {
    clearTimeout(this.autoSaveTimeout);
  }

  logout = () => {
    this.props.logoutUser(this.props.name).then(() => {
      history.push('/');
    });
  }

  saveSnapshotWithPage = () => {
    savePageSnapshot(this.props.projectID());
    this.props.savePage();
  }

  focusOnButton(event) {
    event.target.focus();
  }

  render() {
    const prefButtonClassName = classNames('main-toolbar__pref', {
      'main-toolbar__pref--open': this.props.isPreferencesPanelOpen
    });
    let saveButtonText = 'Remix';
    if (this.props.name) { // user is logged in
      if (this.props.canEdit) { // it is users sketch
        if (this.props.unsavedChanges) { // there are some unsaved changes
          saveButtonText = 'Save';
        } else { // there are no unsaved changes
          if (this.props.projectID()) { // eslint-disable-line
            // it is not a new sketch
            saveButtonText = <CheckSVG alt="check svg" />;
          } else { // it is a new sketch
            saveButtonText = 'Save';
          }
        }
      } else { // it is not users sketch
        saveButtonText = 'Remix';
      }
    } else { // user is not logged in
      if (this.props.projectID()) { // eslint-disable-line
        // it is not a new sketch
        saveButtonText = 'Remix';
      } else { // it is a new sketch
        saveButtonText = 'Save';
      }
    }

    const fileDropDownButtonClassName = classNames({
      'upper-toolbar__dropdown': !this.props.isFileDropdownOpen,
      'upper-toolbar__dropdown upper-toolbar__dropdown-open': this.props.isFileDropdownOpen
    });
    const helpDropDownButtonClassName = classNames({
      'upper-toolbar__dropdown': !this.props.isHelpDropdownOpen,
      'upper-toolbar__dropdown upper-toolbar__dropdown-open': this.props.isHelpDropdownOpen
    });

    return (
      <div className="main-toolbar__container">
        <div className="main-toolbar">
          <div className="main-toolbar__div-left">
            <a
              className="logo_toolbar"
              href="https://www.peblio.co/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ToolbarLogo alt="logo in toolbar" />
            </a>
            <div
              className="file-modal__container"
              role="presentation"
              onClick={(e) => {
                this.focusOnButton(e);
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (this.props.isFileDropdownOpen) {
                    this.props.toggleFileDropdown();
                  }
                }, 50);
              }}
            >
              <button
                className={fileDropDownButtonClassName}
                onMouseDown={this.props.toggleFileDropdown}
                onKeyDown={this.props.toggleFileDropdown}
                data-test="toggle-file-dropdown"
              >
                File
              </button>
              {this.props.isFileDropdownOpen && (
                <FileMenu
                  savePage={this.props.savePage}
                />
              )}
            </div>

            <div
              className="file-modal__container"
              role="presentation"
              onClick={(e) => {
                this.focusOnButton(e);
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (this.props.isHelpDropdownOpen) {
                    this.props.toggleHelpDropdown();
                  }
                }, 50);
              }}
            >
              <button
                className={helpDropDownButtonClassName}
                onMouseDown={this.props.toggleHelpDropdown}
                onKeyDown={this.props.toggleHelpDropdown}
                data-test="toggle-help-dropdown"
              >
                Help
              </button>
              {this.props.isHelpDropdownOpen && (
                <HelpMenu />
              )}
            </div>

          </div>
          <input
            className="main-toolbar__title"
            placeholder="Title"
            type="text"
            value={this.props.pageTitle}
            onChange={this.props.setPageTitle}
            readOnly={this.props.preview}
            data-test="main-toolbar__title"
          />
          {this.props.preview || (
            <div className="main-toolbar__pencil-container">
              <Tooltip
                content="Page Title"
              >
                <span
                  className="fa fa-pencil-alt main-toolbar__search-icon"
                >
                </span>
              </Tooltip>
            </div>
          )}
          <div className="main-toolbar__div-right">
            <div className="main-toolbar__div-right-inside">
              <span className="main-toolbar__preview-title">Edit Mode</span>

              <label className="main-toolbar__preview" htmlFor="main-toolbar__checkbox">
                <input
                  id="main-toolbar__checkbox"
                  onChange={this.props.togglePreviewMode}
                  type="checkbox"
                  checked={this.props.preview}
                  data-test="main-toolbar__edit-mode-toggle"
                />
                <div className="main-toolbar__slider"></div>
              </label>
              <button
                className="main-toolbar__save"
                onClick={this.saveSnapshotWithPage}
                data-test="main-toolbar__save-button"
              >
                {saveButtonText}
              </button>
              <div className="main-toolbar__spacer"></div>
              <button
                className="main-toolbar__button"
                onClick={this.props.viewShareModal}
                data-test="main-toolbar__share-button"
              >
              Share
              </button>
              <div className="main-toolbar__spacer"></div>
              <div className="main-toolbar__pref-container">
                <Tooltip content="Settings">
                  <button
                    className="main-toolbar__button "
                    onMouseDown={this.props.togglePreferencesPanel}
                    data-test="main-toolbar__preferences-button"
                  >
                    <PreferencesSVG
                      className={classNames(prefButtonClassName)}
                      alt="open preferences"
                    />
                  </button>
                </Tooltip>
                {this.props.isPreferencesPanelOpen && <Preferences />}
              </div>
              <div className="main-toolbar__spacer"></div>
              <UserAccount
                container='app'
                location={this.props.location}
              />

            </div>
          </div>
        </div>
        {this.props.preview || (
          <InsertToolbar />
        )}
      </div>
    );
  }
}

MainToolbar.propTypes = {
  canEdit: PropTypes.bool.isRequired,
  createNavigationContent: PropTypes.func.isRequired,
  isFileDropdownOpen: PropTypes.bool.isRequired,
  isHelpDropdownOpen: PropTypes.bool.isRequired,
  isPreferencesPanelOpen: PropTypes.bool.isRequired,
  layout: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  name: PropTypes.string.isRequired,
  pageTitle: PropTypes.string.isRequired,
  preview: PropTypes.bool.isRequired,
  projectID: PropTypes.func.isRequired,
  setPageTitle: PropTypes.func.isRequired,
  savePage: PropTypes.func.isRequired,
  toggleHelpDropdown: PropTypes.func.isRequired,
  toggleFileDropdown: PropTypes.func.isRequired,
  togglePreviewMode: PropTypes.func.isRequired,
  togglePreferencesPanel: PropTypes.func.isRequired,
  unsavedChanges: PropTypes.bool.isRequired,
  autoSaveUnsavedChanges: PropTypes.func.isRequired,
  viewShareModal: PropTypes.func.isRequired,
  editorAutoSave: PropTypes.bool.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }).isRequired
};


function mapStateToProps(state) {
  return {
    canEdit: state.user.canEdit,
    isFileDropdownOpen: state.mainToolbar.isFileDropdownOpen,
    isHelpDropdownOpen: state.mainToolbar.isHelpDropdownOpen,
    isPreferencesPanelOpen: state.mainToolbar.isPreferencesPanelOpen,
    layout: state.page.layout,
    name: state.user.name,
    pageTitle: state.page.pageTitle,
    preview: state.page.preview,
    unsavedChanges: state.page.unsavedChanges,
    editorAutoSave: state.preferences.editorAutoSave,

  };
}
const mapDispatchToProps = dispatch => bindActionCreators({
  createNavigationContent,
  setPageTitle,
  togglePreviewMode,
  autoSaveUnsavedChanges,
  ...mainToolbarActions
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(MainToolbar);
