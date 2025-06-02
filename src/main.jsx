import '@react-barcode-scanner/components/dist/index.css'

import {
    Button,
    Card, Container, CssBaseline,
    DialogTitle, Snackbar, Switch,
    Table, TableBody,
    TableCell,
    TableRow,
    TextField,
    FormGroup,
} from '@material-ui/core';
import * as React from 'react';
import ReactDOM from 'react-dom';
import { Scanner } from './Scanner.js';

const HOST = "https://api.gameupc.com/test/"
const API_HEADERS = {"x-api-key": "test_test_test_test_test"}
fetch(HOST + "warmup", {headers: API_HEADERS}).then();

function game_found(bgg_info) {
    // This is where your app would take over.  Good job!
    console.log('Found: ' + JSON.stringify(bgg_info))
}

//
// The general flow of a UPC lookup follows these steps:
// * Warmup the API
// * Request the UPC data
// * Until we have a bgg_info_status == 'verified' (validated result) result:
//   + Prompt the user with our search terms and suggested alternatives
//   + If they choose an alternative, post the results; the reponse should have a bgg_info_status == 'verified' field
//   + If they enter different search terms, request the upc with a ?search=... parameter
//

//
// The UPC_Lookup form gets the UPC from the user; it would normally be done
//    by the camera and UPC recognition code on your app
//
class UPC_lookup extends React.Component {
    constructor (props) {
        super(props);
        this.state = {upc: undefined};
    }
    //////////////////////////////////
    //  Events
    //////////////////////////////////

    //
    // handleLookup - user clicked the lookup button or hit return on the UPC field
    //   Request the UPC data from gameupc.com and send the response to be evaluated
    //
    handleLookup(event, isScanned) {
        // Do the initial fetch of data for the UPC and send it on to the LookupResult,
        //    which is where the "are we done" logic sits
        const upc = this.upcField.value;
        if (isScanned) {
            this.setState({'upc' : upc });
        }
        this.lookupResult.setState({'gameupc_data' : null, 'working' : true, voted: false})
        fetch( HOST + "upc/" + upc + "?search_mode=quality", {headers: API_HEADERS}).then(res => res.json())
            .then((result) => {
                    // Load in the results from the REST service
                    this.lookupResult.setState({'gameupc_data' : result, 'working' : false, voted: false})
                },
                () => {
                    alert("You would have robust error handling here")
                    this.lookupResult.setState({'working' : false, voted: false})
                });

        // We've handled the click/return, so swallow it now
        event.preventDefault();
    }

    //////////////////////////////////
    //  Rendering
    //////////////////////////////////

    //
    // render - The primary component is a UPC field for user input; there is also
    //    a checkbox that will set the state on the results so we can play around
    //    with the alternatives and updating workflows
    //
    render() {
        return <div>
            <Card>
                <form onSubmit={(e) => this.handleLookup(e)}>
                    <Scanner onScan={(code) => {
                        this.upcField = { value: code };
                        this.handleLookup({preventDefault: () => undefined}, true)
                    }} />
                    {/* Input UPC */}
                    <FormGroup>
                        <TextField
                            defaultValue={this.props.default_upc}
                            inputRef={(r) => this.upcField=r}
                            label="UPC"
                            helperText="Normally, you would use the platform's bar code scanner APIs to find the UPC, and not show an editable field to the user"
                            autoFocus/>
                    </FormGroup>

                    <FormGroup>
                        <Button variant="contained" color="primary" type="submit">Lookup</Button>
                    </FormGroup>

                    <FormGroup>
                        <TextField
                            value={this.state?.upc}
                            label="Scanned UPC" />
                        <br/>
                    </FormGroup>
                </form>

            </Card>
            <p/>
            <LookupResult ref={(r) => this.lookupResult=r} />
        </div>;
    }
}

// LookupResult encapsulates the logic and view for processing results from gameupc.
//   If there is a good bgg_info_status field, it calls into the game_found code
//   If not, it handles choosing from alternatives, or accepting new search terms
//   to find the best alternative
//
class LookupResult extends React.Component {
    //////////////////////////////////
    //  Rendering
    //////////////////////////////////

    //
    // ItemChoice - a table row that shows the name of the game and the thumbail
    //    picture.  If the user clicks on the row to select the game as the correct
    //    choice, we'll update gameupc.com and pass the game on to the user
    //
    ItemChoice(props) {
        return <TableRow onClick={props.onClick} hover>
            <TableCell>{props.item.name}</TableCell>
            <TableCell align="center"><img alt={props.item.name} src={props.item.thumbnail_url} className="boxart"/></TableCell>
        </TableRow>;
    }

    // The lookup result chooser has two parts: the alternatives suggested by gameupc,
    //    and a free-text search field for the user to put in their own search terms
    //    in case we got it wrong.
    //
    // Clicking on an alternative will select the game and update the servers, while
    //    putting in a new search term will update the data for this form for the user
    //    to make a different choice
    render() {
        if (this.state != null && this.state.gameupc_data != null) {
            const gameupc_data = this.state.gameupc_data;
            if (this.shouldShowAlternatives(this.state.gameupc_data)) {
                // Generate the table rows for each bgg_info record in the results
                const item_rows = gameupc_data.bgg_info.map((item) => <this.ItemChoice key={item.id} item={item} onClick={this.handleUpdateClick.bind(this, item, true)}/>)

                // Show the:
                // * Title
                // * Search field
                // * Alternative choices
                return <Card>
                    <DialogTitle>Which game did you scan?</DialogTitle>
                    <h5>We found multiple possible matches for your UPC; please select one</h5>

                    <form onSubmit={this.handleSearch.bind(this)}>
                        <TextField
                            defaultValue={gameupc_data.searched_for}
                            inputRef={(r)=>this.search_field=r}
                            label="Search Terms"
                            autoFocus/>
                        <Button variant="contained" color="primary" type="submit" size="small">Search</Button>
                    </form>

                    <Table><TableBody>
                        {item_rows}
                    </TableBody></Table>

                </Card>
            } else {
                const handlePopupClose = () => {
                    this.setState({voted: false})
                };
                const msg = "Updated barcode '" + this.state.gameupc_data.upc + "' to be associated with '" + this.state.gameupc_data.bgg_info[0].name + "'"

                return <div>
                    <hr/>
                    <Container>
                        <h2>{gameupc_data.bgg_info[0].name}</h2>
                        <img alt={gameupc_data.bgg_info[0].name} src={gameupc_data.bgg_info[0].image_url} className="finalart"/>
                    </Container>
                    <Snackbar
                        open ={this.state.voted}
                        anchorOrigin={{vertical: 'bottom',horizontal: 'left',}}
                        autoHideDuration={5000}
                        onClose={handlePopupClose}
                        action={<Button color="inherit" size="small" onClick={this.handleUpdateClick.bind(this, this.state.gameupc_data.bgg_info[0], false)}>Undo</Button>}
                        message={msg}/>
                </div>
            }
        } else if (this.state != null && this.state.working) {
            return <div>
                <hr/>
                <Container align="center">
                    <img alt="Working" src="/barcode-working.gif"/>
                </Container>
            </div>
        } else {
            return <div/>
        }
    }

    //////////////////////////////////
    //  Events
    //////////////////////////////////

    //
    // handleSearch - the user clicked the "search" button to use an alternative
    //    search text to find the correct game for the UPC.  Our heuristics generally
    //    try to find a good match for the UPC, but sometimes we're lacking good data
    //    and need to rely on users to type in the right thing.
    //
    handleSearch() {
        const URL = HOST + "upc/" + this.state.gameupc_data.upc + "?search=" + this.search_field.value;

        this.setState({'gameupc_data': null, 'working': true, voted: false})
        fetch(URL, {headers: API_HEADERS}).then(res => res.json())
            .then((result) => {
                    this.setState({'gameupc_data': result, 'working': false, voted: false})
                },
                (error) => {
                    void error;
                    alert("You would have robust error handling here")
                    this.setState({'gameupc_data': null, 'working': false, voted: false})
                });
        event.preventDefault();
    }

    //
    // handleUpdateClick - the user clicked on one of the items to choose it as
    //    the correct game for this UPC.  We post the update to the gameupc servers
    //    and then return (this is where your app would take over again)
    //
    handleUpdateClick(item, update=true) {
        // Post some json with {"user_id": {some user id}} to the update_url URL to
        //    record the correct game
        const target_url = item.update_url
        const body_json = JSON.stringify({"user_id": get_user_id()})
        const http_verb = update ? "post" : "delete"

        // Really should give some "working..." feedback here while we're doing the
        //    post, in case the latency gets high.  Most update posts take ~500ms
        this.setState({'gameupc_data': null, 'working': true, voted: false})
        fetch(target_url, {
            method: http_verb,
            headers: API_HEADERS,
            body: body_json
        }).then(res => res.json())
            .then((result) => {
                    this.setState({'gameupc_data' : result, working: false, voted:update})
                },
                (error) => {
                    // You would do some real error handling here
                    void error;
                    this.setState({'gameupc_data' : null, working: false, voted:false})
                }
            )
    }

    //
    // componentDidUpdate - check the new state and see if we have found a good
    //    result for the user.  If so, pass it on; if not, set up the internal
    //    state for the panel
    //
    componentDidUpdate() {
        // Don't do anything if we don't have data from gameupc
        if (this.state && this.state.gameupc_data) {
            if (!this.shouldShowAlternatives(this.state.gameupc_data)) {
                game_found(this.state.gameupc_data.bgg_info[0])
            }
        }
    }

    //////////////////////////////////
    //  Utility functions
    //////////////////////////////////

    //
    // shouldShowAlternatives - returns whether or not the alternatives
    //    panel should be shown
    //
    shouldShowAlternatives(gameupc_result) {
        // If the bgg_info_status field in the results is 'verified', then you have a good match.
        // If it is not verified, you need to display alternatives for the user and let them pick

        // If we don't have any state yet, definitely don't show
        if (gameupc_result === null || gameupc_result === undefined) {
            return false;
        }

        // By default, show if and only if there is a good bgg_info_status in the result json
        return gameupc_result.bgg_info_status !== 'verified'
    }

}

//////////////////////////////////
//  React startup
//////////////////////////////////

// Show the initial UPC Lookup component; normally, your app would do that via
//    the camera and call straight into the search() function
function main_page() {
    let default_upc = "019962194719"
    if(window.location.hash)
        default_upc = window.location.hash.substring(1)

    return <React.Fragment>
        <CssBaseline />
        <Container maxWidth="md">
            <UPC_lookup default_upc={default_upc}/>
        </Container>
    </React.Fragment>;
}
ReactDOM.render(main_page(), document.getElementById('root'));


//
// NOTE TO THE READER:
//   If you've read this far, you're probably much better at React than I am.
//   I would welcome any updates that would help this code achieve its purpose
//   of helping people to understand how to write a good client for the gameupc
//   REST API.  Note that making a better experience with this page is OK, but
//   not if it impugns any understanding by the readers
//


//////////////////////////////////
//  Utility functions
//////////////////////////////////

function get_user_id() {
    // You would use a device ID in the case of an app; for this demonstration,
    //    we'll cons up a random persistent client ID
    let result = localStorage.getItem( "gameupc_user_id" );
    if (!result) {
        result = Math.random().toFixed(16).split('.')[1]
        localStorage.setItem("gameupc_user_id", result)
    }
    return result
}
