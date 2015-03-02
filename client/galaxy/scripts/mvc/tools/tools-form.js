/**
    This is the regular tool form.
*/
define(['utils/utils', 'mvc/ui/ui-misc', 'mvc/tools/tools-form-base', 'mvc/tools/tools-jobs'],
    function(Utils, Ui, ToolFormBase, ToolJobs) {

    // create form view
    var View = ToolFormBase.extend({
        // initialize
        initialize: function(options) {
            var self = this;
            options.buttons = {
                execute : new Ui.Button({
                    icon     : 'fa-check',
                    tooltip  : 'Execute: ' + options.name,
                    title    : 'Execute',
                    cls      : 'btn btn-primary',
                    floating : 'clear',
                    onclick  : function() {
                        ToolJobs.submit(self.form, options);
                    }
                })
            };
            ToolFormBase.prototype.initialize.call(this, options);
        },

        /** Builds a new model through api call and recreates the entire form
        */
        _buildModel: function() {
            // link this
            var self = this;
            
            // construct url
            var model_url = galaxy_config.root + 'api/tools/' + this.options.id + '/build?';
            if (this.options.job_id) {
                model_url += 'job_id=' + this.options.job_id;
            } else {
                if (this.options.dataset_id) {
                    model_url += 'dataset_id=' + this.options.dataset_id;
                } else {
                    model_url += 'tool_version=' + this.options.version + '&';
                    var loc = top.location.href;
                    var pos = loc.indexOf('?');
                    if (loc.indexOf('tool_id=') != -1 && pos !== -1) {
                        model_url += loc.slice(pos + 1);
                    }
                }
            }

            // register process
            var process_id = this.deferred.register();

            // get initial model
            Utils.request({
                type    : 'GET',
                url     : model_url,
                success : function(response) {
                    // build new tool form
                    self._buildForm(response);

                    // notification
                    self.form.message.update({
                        status      : 'success',
                        message     : 'Now you are using \'' + self.options.name + '\' version ' + self.options.version + '.',
                        persistent  : false
                    });

                    // process completed
                    self.deferred.done(process_id);

                    // log success
                    console.debug('tools-form::initialize() - Initial tool model ready.');
                    console.debug(response);
                },
                error   : function(response) {
                    // process completed
                    self.deferred.done(process_id);

                    // log error
                    console.debug('tools-form::initialize() - Initial tool model request failed.');
                    console.debug(response);

                    // show error
                    var error_message = response.error || 'Uncaught error.';
                    self.form.modal.show({
                        title   : 'Tool cannot be executed',
                        body    : error_message,
                        buttons : {
                            'Close' : function() {
                                self.form.modal.hide();
                            }
                        }
                    });
                }
            });
        },

        /** Request a new model for an already created tool form and updates the form inputs
        */
        _updateModel: function(current_state) {
            // link this
            var self = this;
            
            // create the request dictionary
            var form = this.form;

            // create the request dictionary
            var current_state = {
                tool_id         : this.options.id,
                tool_version    : this.options.version,
                inputs          : current_state
            }

            // set wait mode
            form.wait(true);

            // register process
            var process_id = this.deferred.register();

            // log tool state
            console.debug('tools-form::_refreshForm() - Sending current state (see below).');
            console.debug(current_state);

            // build model url for request
            var model_url = galaxy_config.root + 'api/tools/' + this.options.id + '/build';
            
            // post job
            Utils.request({
                type    : 'POST',
                url     : model_url,
                data    : current_state,
                success : function(new_model) {
                    // update form
                    form.data.matchModel(new_model, function(input_id, node) {
                        var input = form.input_list[input_id];
                        if (input && input.options) {
                            if (!_.isEqual(input.options, node.options)) {
                                // backup new options
                                input.options = node.options;
                                
                                // get/update field
                                var field = form.field_list[input_id];
                                if (field.update) {
                                    var new_options = [];
                                    if ((['data', 'data_collection', 'drill_down']).indexOf(input.type) != -1) {
                                        new_options = input.options;
                                    } else {
                                        for (var i in node.options) {
                                            var opt = node.options[i];
                                            if (opt.length > 2) {
                                                new_options.push({
                                                    'label': opt[0],
                                                    'value': opt[1]
                                                });
                                            }
                                        }
                                    }
                                    field.update(new_options);
                                    field.trigger('change');
                                    console.debug('Updating options for ' + input_id);
                                }
                            }
                        }
                    });

                    // unset wait mode
                    form.wait(false);

                    // log success
                    console.debug('tools-form::_refreshForm() - Received new model (see below).');
                    console.debug(new_model);
                    
                    // process completed
                    self.deferred.done(process_id);
                },
                error   : function(response) {
                    // process completed
                    self.deferred.done(process_id);

                    // log error
                    console.debug('tools-form::_refreshForm() - Refresh request failed.');
                    console.debug(response);
                }
            });
        }
    });

    return {
        View: View
    };
});
