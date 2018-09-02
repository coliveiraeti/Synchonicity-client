var Synchronicity = Synchronicity || {};

Synchronicity.Core = (function () {
    init = async function () {
        await CefSharp.BindObjectAsync("cefCustomObject");
    }

    callRdpClient = function (id) {
        cefCustomObject.callRdpClient(`Synchronicity.Server.notifyDisconnect('${id}')`);
    }

    bootstrap = function (userName) {
        Synchronicity.Server.startSignalR(async function () {
            Synchronicity.VMList.populate(await Synchronicity.Server.listVMs());
        });

        document.querySelector('#userName').innerHTML = userName;
        document.querySelector('.list-group').addEventListener('click', function (event) {
            event.preventDefault();
            var element = event.target.closest('.list-group-item');
            if (element) {
                element.setAttribute('data-selected', '');
                $('#divDescription').modal('show');
            }
        }, false);

        document.querySelector('#linkConfiguration').addEventListener('click', async function (event) {
            event.preventDefault();
            Synchronicity.Navigate.toConfiguration();
        });

        document.querySelector('#buttonConnect').addEventListener('click', async function (event) {
            event.preventDefault();
            var selected = document.querySelector('[data-selected]');
            var configuration = await Synchronicity.Configuration.get();
            Synchronicity.Server.notifyConnect(
                selected.attributes['data-vm-id'].value,
                configuration.userName,
                document.querySelector('#inputDescription').value
            );
            $('#divDescription').modal('hide');
            Synchronicity.Core.callRdpClient(selected.attributes['data-vm-id'].value);
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

    get = async function () {
        var conf = await cefCustomObject.getConfiguration();
        return {
            serverUrl: conf.ServerUrl,
            userName: conf.UserName,
            password: conf.Password
        }
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

Synchronicity.Server = (function () {
    const hubName = 'SynchronicityHub';
    var connection, hub;

    listVMs = async function () {
        var configuration = await Synchronicity.Configuration.get();
        var url = configuration.serverUrl;
        var response = await fetch(url + 'virtualmachine', { method: 'GET' });
        return response.json();
    }

    startSignalR = async function (callback) {
        var configuration = await Synchronicity.Configuration.get();
        var url = configuration.serverUrl;
        connection = $.hubConnection(url);
        hub = connection.createHubProxy(hubName);

        hub.on('refresh', function () {
            callback();
        })
        connection.start().done(function () {
            hub.invoke('refresh');
        })
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
        startSignalR: startSignalR,
        notifyConnect: notifyConnect,
        notifyDisconnect: notifyDisconnect
    };
}());