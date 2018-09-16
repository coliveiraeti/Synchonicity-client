var Synchronicity = Synchronicity || {};

Synchronicity.Core = (function () {
    init = function () {
        return CefSharp.BindObjectAsync("cefCustomObject");
    }

    callRdpClient = function (id, title, parameters, username, password) {
        cefCustomObject.callRdpClient(title, parameters, username, password, `Synchronicity.Server.notifyDisconnect('${id}')`);
    }

    bootstrap = function (userName) {
        document.querySelector('#userName').innerHTML = userName;

        Synchronicity.Server.startSignalR(function () {
            Synchronicity.Server.listVMs().then(function (json) {
                Synchronicity.VMList.populate(json)

                document.querySelector('.list-group').addEventListener('click', function (event) {
                    event.preventDefault();

                    if (event.target.hasAttribute('data-role') &&
                        event.target.attributes['data-role'].value === 'history') {
                        var listItem = event.target.closest('.list-group-item')
                        var vmId = listItem.attributes['data-vm-id'].value
                        document.querySelector('#buttonSearchHistory').setAttribute('data-vm-id', vmId)
                        Synchronicity.Server.listHistory(vmId, '', Synchronicity.HistoryList.populate)
                        $('#divHistory').modal('show')
                    }
                    else {
                        var element = event.target.closest('.list-group-item')
                        if (element) {
                            element.setAttribute('data-selected', '')
                            $('#divDescription').modal('show')
                        }
                    }
                }, false);

            })
        })

        document.querySelector('#linkConfiguration').addEventListener('click', async function (event) {
            event.preventDefault();
            Synchronicity.Navigate.toConfiguration();
        });

        document.querySelector('#buttonConnect').addEventListener('click', function (event) {
            event.preventDefault();
            var selected = document.querySelector('[data-selected]');
            Synchronicity.Configuration.get().then(function (configuration) {

                Synchronicity.Server.notifyConnect(
                    selected.attributes['data-vm-id'].value,
                    configuration.userName,
                    document.querySelector('#inputDescription').value
                );
                $('#divDescription').modal('hide');
                Synchronicity.Core.callRdpClient(
                    selected.attributes['data-vm-id'].value,
                    selected.querySelector('[data-vm-name]').innerHTML,
                    selected.attributes['data-wfreerdp-parameters'].value,
                    document.querySelector('#inputUsername').value,
                    document.querySelector('#inputPassword').value
                );

            });
        });

        document.querySelector('#buttonSearchHistory').addEventListener('click', function () {
            Synchronicity.Server.listHistory(this.attributes['data-vm-id'].value,
                document.querySelector('#inputSearchDescription').value,
                Synchronicity.HistoryList.populate)
        })

        $('#divHistory').on('show.bs.modal', function () {
            document.querySelector('#inputSearchDescription').value = '';
        });
      
        $('#divDescription').on('show.bs.modal', function () {
            document.querySelector('#inputDescription').value = '';
        });

        $('#divDescription').on('hidden.bs.modal', function () {
            document.querySelector('[data-selected]').removeAttribute('data-selected');
        });
    }

    return {
        bootstrap: bootstrap,
        init: init,
        callRdpClient: callRdpClient
    }
}());

Synchronicity.Navigate = (function () {

    changeLocation = function (newPage) {
        var slices = window.location.pathname.split('/');
        slices[slices.length - 1] = newPage;
        window.location.assign(window.location.protocol + '///' + slices.join('/'));
    };

    toConfiguration = function () {
        changeLocation('configuration.html');
    }

    toIndex = function () {
        changeLocation('index.html');
    }

    return {
        toConfiguration: toConfiguration,
        toIndex: toIndex 
    };
}());

Synchronicity.Configuration = (function () {

    get = function () {
        return cefCustomObject.getConfiguration().then(
            function (conf) {
                return {
                    serverUrl: conf.ServerUrl,
                    userName: conf.UserName,
                    wFreeRdpPath: conf.WFreeRdpPath
                }
            })
    }

    set = async function (serverUrl, userName, password) {
        await cefCustomObject.setConfiguration(serverUrl, userName, password);
    }

    return {
        get: get,
        set: set
    };
}());

Synchronicity.VMList = (function () {

    setBusy = function (id) {
        var element = document.querySelector('.list-group-item#' + id)
        element.classList.remove('list-group-item-success');
        element.classList.add('list-group-item-danger');
    };

    setAvailable = function (id) {
        var element = document.querySelector('.list-group-item#' + id)
        element.classList.remove('list-group-item-danger');
        element.classList.add('list-group-item-success');
    }

    populate = function (json) {
        var listGroup = document.querySelector('.list-group');
        for (var item in json) {
            var currentElement = listGroup.querySelector('.list-group-item#vm-' + json[item].Id);
            if (!currentElement) {
                var template = document.querySelector('#vm-template');
                var clone = template.cloneNode(true);
                clone.id = 'vm-' + json[item].Id;
                clone.setAttribute('data-vm-id', json[item].Id);
                clone.setAttribute('data-wfreerdp-parameters', json[item].WFreeRdpParameters);
                clone.classList.remove('invisible');
                clone.innerHTML = clone.innerHTML.replace('{name}', json[item].Name);
                listGroup.appendChild(clone);
                currentElement = listGroup.querySelector('.list-group-item#vm-' + json[item].Id);
            }
            
            if (json[item].History[0] !== null) {
                currentElement.setAttribute('data-hist-id', json[item].History[0].Id);
                currentElement.querySelector('[data-user]').innerHTML = json[item].History[0].CreationUser;
                currentElement.querySelector('[data-description]').innerHTML = json[item].History[0].Description;
            }
            else {
                currentElement.setAttribute('data-hist-id', '');
                currentElement.querySelector('[data-user]').innerHTML = '';
                currentElement.querySelector('[data-description]').innerHTML = '';
            }
        }

        var items = listGroup.querySelectorAll('.list-group-item');
        for (var i = 0; i < items.length; i++) {
            if (!items[i].hasAttribute('data-hist-id')) {
                continue;
            }
            if (items[i].attributes['data-hist-id'].value === '') {
                setAvailable(items[i].id);
            }
            else {
                setBusy(items[i].id);
            } 
        }
    }

    return {
        setBusy: setBusy,
        setAvailable: setAvailable,
        populate: populate
    };
}());

Synchronicity.HistoryList = (function () {
    populate = function (json) {
        var newTBody = document.createElement('tbody')
        for (var item in json) {
            var row = newTBody.insertRow(-1)
            var date = new Date(json[item].CreationDate)
            row.insertCell(0).innerHTML = date.toLocaleString()
            row.insertCell(1).innerHTML = json[item].CreationUser
            row.insertCell(2).innerHTML = json[item].Description
        }
        var tableBody = document.querySelector('#divHistory .modal-body .table tbody')
        tableBody.parentNode.replaceChild(newTBody, tableBody)
    }

    return {
        populate: populate
    }
}());

Synchronicity.Server = (function () {
    const hubName = 'SynchronicityHub';
    var connection, hub;

    listVMs = function () {
        return Synchronicity.Configuration.get().then(function (configuration) {
            var url = configuration.serverUrl;
            return fetch(`${url}virtualmachine`).then(function (response) {
                return response.json();
            });
        });
    }

    listHistory = async function (virtualMachineId, description, callback) {
        await Synchronicity.Configuration.get().then(function (configuration) {
            var baseUrl = configuration.serverUrl
            description = encodeURI(description)
            var url = `${baseUrl}history?virtualMachineId=${virtualMachineId}&description=${description}`
            fetch(url,
                { method: 'GET' })
                .then(function (response) {
                    response.json().then(function (json) {
                        callback(json)
                    })
                })
        })
    }

    startSignalR = function (callback) {
        return Synchronicity.Configuration.get().then(function (configuration) {
            var url = configuration.serverUrl;
            connection = $.hubConnection(url);
            hub = connection.createHubProxy(hubName);

            hub.on('refresh', function () {
                callback();
            })
            connection.start().done(function () {
                hub.invoke('refresh');
            })
        });
    }

    notifyConnect = function (idVM, user, description) {
        hub.invoke('connect', idVM, user, description);
    }

    notifyDisconnect = function (idVM) {
        var element = document.querySelector('[data-vm-id="' + idVM + '"]');
        hub.invoke('disconnect', element.attributes['data-hist-id'].value);
    }

    return {
        listVMs: listVMs,
        listHistory: listHistory,
        startSignalR: startSignalR,
        notifyConnect: notifyConnect,
        notifyDisconnect: notifyDisconnect
    };
}());