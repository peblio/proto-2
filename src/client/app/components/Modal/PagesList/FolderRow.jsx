import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import formatDate from '../../../utils/format-date.js';
import { deleteFolder } from '../../../action/page.js';
import DeleteIcon from '../../../images/trash.svg';

class FolderRow extends Component {
  render() {
    const { folder, id } = this.props;
    return (
      <tr className="pages__row" key={id}>
        <td className="pages__col" >{folder.title}</td>
        <td className="pages__col" > {formatDate(folder.createdAt)} </td>
        <td className="pages__col" > {formatDate(folder.updatedAt)} </td>
        <td className="pages__col" >
          <button className="pages__delete" onClick={() => { this.props.deleteFolder(id); }}>
            <DeleteIcon alt="delete page" />
          </button>
        </td>
      </tr>
    );
  }
}

FolderRow.propTypes = {
  deleteFolder: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  folder: PropTypes.shape({}).isRequired
};

const mapStateToProps = (state, ownProps) => ({
  folder: state.page.folders.byId[ownProps.id]
});
const mapDispatchToProps = dispatch => bindActionCreators({ deleteFolder }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(FolderRow);
