import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import axios, { CancelToken, doAll } from "../lib/request.js";
import Router from "next/router";

const AutoCompleteStyle = styled.section`

		.search-bar {
			width: 100%;
			margin-top: 1em;
			margin-bottom: 1em;
			font-size: 1em;
			display: inline-block;
			position: relative;
			color: #4a4a4a;
		}

		input {
			box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
			border-radius: 4px 0px 0px 4px;
			border-width: 1px 0px 1px 1px;
			border-color: #dbdbdb;
			border-style: solid;
			font-size: 1em;
			padding-right: 1.5rem;
			width: 100%;
		}

		.input-text {
			padding-left: 8px;
		}

		.button {
			border-radius: 0px 4px 4px 0px;
		}

		.search-form {
			display: flex;
			flex-flow: row nowrap;
		}

		.loader {
			color: #dcdcdc;
			border: none;
			height: 1.25rem;
			width: 1.25rem;
			right: 45px;
			top: calc(50% - 0.625rem);
			text-shadow: none;
			position: absolute;
		}
		.not-loading {
			position: absolute;
			visibility: hidden;
		}

		.dropdown {
			font-size: 0.9rem;
			max-height: ${props => props.height};
			overflow: auto;
			top: 100%;
			left: 0;
			right: 0;
			position: absolute;
			z-index: 99;
			background: white;
			box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
		}

		.no-dropdown {
			top: 100%;
			left: 0;
			right: 0;
			position: absolute;
			z-index: 99;
			background: white;
			box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);

		}

		.suggestion-list {
			width: 100%;
			border: 1px solid #d4d4d4;
			border-bottom: none;
			border-top: none;
		}

		li {
			align-items: center;
			cursor: pointer;
			display: flex;
			min-width: 0;
			padding: 0.5em 0.75em;
		}

		li > img {
			margin-right: .3rem;
			height: 15px;
			width: 15px;
		}

		li > span {
			display: block;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.selected {
			background: ${({ theme }) => theme.colors.bordercolor};
		}

		.no-suggestions {
			border-bottom: 1px solid ${({ theme }) => theme.colors.bordercolor};
			padding: 1px 1px 1px 8px;
		}

		.loading {
			visibility: hidden;
		}

		.label {
			color: #7a7a7a;
			font-size: 0.8rem;
			font-weight: 400;
			letter-spacing: 0.1em;
			margin: .6em 0 .6em 0;
			padding: 0em 0.75em;
			text-transform: uppercase;
		}

		.label:first-child {
			border-top: none;
		}
`;

const SuggestedItem = ({selectedIndex, onMouseDown, onMouseOver, index, suggestion }) => (
	<li
		className={selectedIndex === index ? "selected" : "suggestion"}
		onMouseDown={onMouseDown}
		onMouseOver={onMouseOver}
		index={index}
	>
		<img src={suggestion.iconURL} index={index} />
		<span index={index}>{(suggestion.kind === "vignette" || suggestion.kind === "tutorial")
			? suggestion.title
			: suggestion.name
		}</span>
	</li>
);

const getKeyFromSug = s => s.id || s.name || s.title || 'wtf';
const SuggestedItemLabel = ({index, selectedIndex, onMouseDown, onMouseOver, suggestion, suggestionName}) => suggestion && suggestion.label
	? <React.Fragment>
		<li className="label">{suggestion.label}</li>
		<SuggestedItem
			selectedIndex={selectedIndex}
			onMouseDown={onMouseDown}
			onMouseOver={onMouseOver}
			index={index}
			suggestion={suggestion}
		/>
	</React.Fragment>
	: <SuggestedItem
		selectedIndex={selectedIndex}
		onMouseDown={onMouseDown}
		onMouseOver={onMouseOver}
		index={index}
		suggestion={suggestion}
	/>

const SuggestionList = ({
	suggestedResults,
	selectedIndex,
	showResults,
	query,
	blurStatus,
	loadStatus,
	onMouseDown,
	onMouseOver
}) => !(showResults && query && blurStatus)
	? null
	: loadStatus === "loading"
		? (<div className="loading"></div>)
		: (suggestedResults && suggestedResults.length)
			 ? (<ul className="suggestion-list">
					{
					suggestedResults.map((suggestion, index) => <SuggestedItemLabel
						key={getKeyFromSug(suggestion) }
						label={suggestion.label}
						index={index}
						selectedIndex={selectedIndex}
						onMouseDown={onMouseDown}
						onMouseOver={onMouseOver}
						suggestion={suggestion}
					/>)
					}
				</ul>
				)
			: (<div className="no-suggestions">
				<p> No Results Found. </p>
				</div>
				)

const parseIndex = i => {
	const v = parseInt(i, 10)
	return isNaN(v) ? -1 : v
}

const getIndexFromEvent = e => e && e.target && e.target.getAttribute && e.target.getAttribute("index")
		? parseIndex(event.target.getAttribute("index"))
		: -1

function debounce(fn, delay) {
	let timer = null;
	return function () {
		const context = this;
		const args = arguments;
		clearTimeout(timer);
		timer = setTimeout(function () {
			fn.apply(context, args);}, delay);
	};
}

function routingHelper(searchQuery) {
	let path = "";
	if(searchQuery.kind === "object") {
		path = "/max8/refpages/" + searchQuery.name;
	} else if(/^genobject/.test(searchQuery.kind)) { // gen object
		let genPrefix;
		if (searchQuery.kind === "genobject_common") {
			genPrefix = "gen_common";
		} else if (searchQuery.kind === "genobject_dsp") {
			genPrefix = "gen_dsp";
		} else {
			// genjit
			genPrefix = "gen_jit";
		}
		path = "/max8/refpages/" + genPrefix + "_" + searchQuery.name;
	} else { // docs
		if (searchQuery.kind === "tutorial") {
			path = "/max8/tutorials/" + searchQuery.name;
		} else {
			path = "/max8/vignettes/" + searchQuery.name;
		}
	}
	return path;
}

const	goToQuery = (searchQuery, query) => {
	let path = routingHelper(searchQuery);
	Router.push({pathname: path, query: {q: query}});
}

const insertLabel = (list, label) => list && list.length
	? list.map((l,idx) => idx === 0 ? Object.assign(l, {label}) : l)
	: list

const concatResultsWithLabels = (o, g, d) => insertLabel(o, "Object")
	.concat(insertLabel(g, "Gen Object"))
	.concat(insertLabel(d, "Documentation"))



class Search extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			query: props.query || "",
			suggestedResults: [],
			showResults: false,
			selectedIndex: -1,
			loadStatus: "loaded",
			suggestionClass: "suggestion",
			blurStatus: true,
			maxHeight: ""
		};
	}
	handleResize = (event) => {
		const height = window.innerHeight - (window.innerHeight / 3);
		const heightString = height.toString(10) + "px";
		this.setState({
			maxHeight: heightString
		});
	}

	componentDidMount() {
		window.addEventListener("resize", this.handleResize);
	}
	componentWillUnmount() {
		window.removeEventListener("resize", this.handleResize);
	}
	onTermChange = debounce((event) => {
		const query = event && event.target && event.target.value ?  event.target.value : "";
		const {suggestedResults} = this.state;
		if(suggestedResults[0] === null) {
			this.setState({
				showResults: false
			});
		} else {
			this.setState({
				query,
				showResults: true
			});
		}
		this.search(query);
	}, 500)

	onChange = (e) => {
		if(e.target.value === "") {
			return this.setState({
				loadStatus: "loaded",
				selectedIndex: -1,
				query: e.target.value
			});
		}
		e.persist();
		this.setState({
			loadStatus: "loading",
			selectedIndex: -1,
			query: e.target.value
		});
		this.onTermChange(e);
	}

	cancelSource = null
	search = (query) => {
		const cancelSource = CancelToken.source();
		if(this.cancelSource !== null) {
			this.cancelSource.cancel("previous call cancelled");
		}
		this.cancelSource = cancelSource;
		const requests = [
			axios.get(`/api/max8/${encodeURIComponent("objects")}/search/${encodeURIComponent(query)}`, { cancelToken: cancelSource.token}),
			axios.get(`/api/max8/${encodeURIComponent("gen")}/search/${encodeURIComponent(query)}`, { cancelToken: cancelSource.token}),
			axios.get(`/api/max8/${encodeURIComponent("docs")}/search/${encodeURIComponent(query)}`, { cancelToken: cancelSource.token})
		];
		doAll(requests)
			.then(([objRes, genRes, docRes]) =>  {
				const objResShort = objRes.data.results.slice(0, 5);
				const genResShort = genRes.data.results.slice(0, 5);
				const docResShort = docRes.data.results.slice(0, 5);
				const suggestedResults  = concatResultsWithLabels(objResShort, genResShort, docResShort);
				this.setState({
					suggestedResults,
					loadStatus: "loaded"
				});
			}) .catch((error) => {
				console.log("error getting results from server");
			});
	}

	onKeyDown = (event) => {
		const {suggestedResults, selectedIndex, query } = this.state;
		if(!query) {
			return;
		}
		if(event.keyCode === 13 && selectedIndex === -1) {
			Router.push({pathname: "/max8/search/objects/", query:	{q: query}});
		}
		else if(event.key === "Enter" || event.key === "Return") {
			goToQuery(suggestedResults[selectedIndex], query)
		}
		else if(event.key === "ArrowUp") {
			event.preventDefault();
			this.setState({
				selectedIndex: selectedIndex < 0
					? suggestedResults.length - 1
					: selectedIndex - 1
			});
		}
		else if(event.key === "ArrowDown") {
			this.setState({
				selectedIndex: (selectedIndex === suggestedResults.length - 1)
					? -1
					: selectedIndex + 1
			});
		} else if(event.key === "Esc") {
			this.setState({
				query: ""
			});
		}
	}

	onMouseOver = (event) => this.setState({
		selectedIndex: getIndexFromEvent(event)
	});


	onMouseDown = (event) => {
		const { suggestedResults, query } = this.state;
		const selectedIndex = getIndexFromEvent(event)
		this.setState({
			blurStatus: true,
			selectedIndex
		})
		return ((selectedIndex > -1) && (selectedIndex < suggestedResults.length))
			? goToQuery(suggestedResults[selectedIndex], query)
			: null
	}

	onSubmit = (e) => {
		const {suggestedResults, selectedIndex, query } = this.state;
		if(selectedIndex < 0) {
			Router.push({pathname: "/max8/search/objects/", query: {q: query}});
		} else if (selectedIndex < suggestedResults.length) {
			goToQuery(suggestedResults[selectedIndex], query);
		}
	}

	onBlur = (event) => this.setState({
		blurStatus: false
	});

	onFocus = () => this.setState({
		blurStatus: true
	});

	render() {
		const { suggestedResults, selectedIndex, showResults, query, blurStatus, loadStatus } = this.state;
		return (
			<React.Fragment>
				<AutoCompleteStyle height={ this.state.maxHeight }>
					<div className="search-bar">
						<form onSubmit={ this.onSubmit } className="search-form">
							<input
								className ="input-text is-medium"
								placeholder="Search"
								value={ this.state.query }
								onChange={ this.onChange }
								onKeyDown={ this.onKeyDown }
								onBlur={ this.onBlur }
								onFocus={ this.onFocus }
							/>
							<FontAwesomeIcon width="5em" className={this.state.loadStatus === "loading" ? "loader" : "not-loading"} icon= { faCircleNotch } spin/>
							<div className="control">
								<button type="submit" className="button">
									<FontAwesomeIcon icon= { faSearch } />
								</button>
							</div>
						</form>
						<div className="dropdown">
							<SuggestionList
								suggestedResults={suggestedResults}
								selectedIndex={selectedIndex}
								showResults={showResults}
								query={query}
								blurStatus={blurStatus}
								loadStatus={loadStatus}
								onMouseDown={this.onMouseDown}
								onMouseOver={this.onMouseOver}
							/>
						</div>
					</div>
				</AutoCompleteStyle>
			</React.Fragment>
		);
	}
}

export default Search;
