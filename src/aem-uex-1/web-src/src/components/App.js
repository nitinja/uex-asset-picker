/*
 * <license header>
 */

import React from "react";
import ErrorBoundary from "react-error-boundary";
import { Route, HashRouter as Router, Routes } from "react-router-dom";
import ExtensionRegistration from "./ExtensionRegistration";
import Openassetpicker from "./Openassetpicker";
import OpenassetpickerModal from "./OpenassetpickerModal";
import SetFilterAttribute from "./SetFilterAttribute";
import TypeRenderer from "./TypeRenderer";

/**
 * Filter object:
 * {
 *  "custom-image-rendition-filter": "renditionName",
 *  "custom-asset-mimetype-filter": "mimeType"
 * }
 */

function App() {
  return (
    <>
      <Router>
        <ErrorBoundary onError={onError} FallbackComponent={fallbackComponent}>
          <Routes>
            <Route index element={<ExtensionRegistration />} />
            <Route
              exact
              path="index.html"
              element={<ExtensionRegistration />}
            />
            <Route
              exact
              path="open-asset-picker-modal"
              element={<OpenassetpickerModal />}
            />
            <Route
              exact
              path="open-asset-picker"
              element={<Openassetpicker />}
            />
            <Route
              exact
              path="renderer/:rendererId"
              element={<TypeRenderer />}
            />
            <Route
              exact
              path="set-filter-attribute/:filterKey"
              element={<SetFilterAttribute />}
            />
            {/* @todo YOUR CUSTOM ROUTES SHOULD BE HERE */}
          </Routes>
        </ErrorBoundary>
      </Router>
    </>
  );

  // Methods

  // error handler on UI rendering failure
  function onError(e, componentStack) {}

  // component to show if UI fails rendering
  function fallbackComponent({ componentStack, error }) {
    return (
      <React.Fragment>
        <h1 style={{ textAlign: "center", marginTop: "20px" }}>
          Phly, phly... Something went wrong :(
        </h1>
        <pre>{componentStack + "\n" + error.message}</pre>
      </React.Fragment>
    );
  }
}

export default App;
