import Web3 from 'web3';
import configuration from '../build/contracts/ACME.json';

const createElementFromString = (string) => {
  const el = document.createElement('div');
  el.innerHTML = string;
  return el.firstChild;
};

const CONTRACT_ADDRESS = configuration.networks['5777'].address;
const CONTRACT_ABI = configuration.abi;

const web3 = new Web3(
  Web3.givenProvider || 'http://127.0.0.1:7545'
);
const contract = new web3.eth.Contract(
  CONTRACT_ABI,
  CONTRACT_ADDRESS
);

let account;

const accountEl = document.getElementById('account');
const ticketsEl = document.getElementById('tickets');
const TOTAL_TICKETS = 10;
const EMPTY_ADDRESS =
  '0x0000000000000000000000000000000000000000';

function get_duration(duration, duration_type) {
    if (duration_type == "hour") {
        duration = duration * 60 * 60;
    } else if (duration_type == "day") {
        duration = duration * 60 * 60 * 24;
    } else if (duration_type == "month") {
        duration = duration * 60 * 60 * 24 * 30;
    }
    return duration;
}
function get_amount_in_weis(amount, amount_type) {
    if (amount_type == "gwei") {
        amount = amount * 1000000000;
    } else if (amount_type == "finney") {
        amount = amount * 1000000000000000;
    } else if (amount_type == "ether") {
        amount = amount * 1000000000000000000;
    }
    return amount;
}

const buyTicket = async (ticket) => {
  await contract.methods
    .buyTicket(ticket.id)
    .send({ from: account, value: ticket.price })
    .then(function (result) {                
        $('#poll-info').html(result)
    });
};

const refreshTickets = async () => {
  ticketsEl.innerHTML = '';
  for (let i = 0; i < TOTAL_TICKETS; i++) {
    const ticket = await contract.methods.tickets(i).call();
    ticket.id = i;
    if (ticket.owner === EMPTY_ADDRESS) {
      const ticketEl = createElementFromString(
        `<div class="ticket card" style="width: 18rem;">
          <img src="${ticketImage}" class="card-img-top" alt="...">
          <div class="card-body">
            <h5 class="card-title">Ticket</h5>
            <p class="card-text">${
              ticket.price / 1e18
            } Eth</p>
            <button class="btn btn-primary">Buy Ticket</button>
          </div>
        </div>`
      );
      ticketEl.onclick = buyTicket.bind(null, ticket);
      ticketsEl.appendChild(ticketEl);
    }
  }
};

const addOption= async (id, opt) => {
  await contract.methods
    .addOption(id, opt)
    .send({from: account, value: 0});
};


function output_create_poll(result, options) {
    if (result) {
        var id = Object.keys(result).length - 1;
        options = options.split("\n")
        for (opt in Object.keys(options)) {
            const r = addOption(id, options[opt]);
        }
    }
};


const add_options= async (options) => {
  await contract.methods
    .getPolls()
    .call()
    .then(function (result) {
        output_create_poll(result, options)
    })
};

const createPoll = async (question, duration, amount, options) => {
  return await contract.methods
    .createPoll(question, duration)
    .send({from: account, value: amount})
    .then(function (result) {
        add_options(options)
    });
};

async function la(question, duration, amount, options) {
    const ret = await createPoll(question, duration, amount, options);
}


const form_poll_create = document.querySelector("#form-poll-create");
if (form_poll_create) {
    form_poll_create.addEventListener("submit", function (event) {
        // stop form submission
        event.preventDefault();
        form = form_poll_create;

        question = form.elements["question"].value;
        amount = form.elements["amount"].value;
        amount_type = form.elements["amount-type"].value;
        duration = form.elements["duration"].value;
        duration_type = form.elements["duration-type"].value;
        amount = get_amount_in_weis(amount, amount_type);
        duration = get_duration(duration, duration_type);
        options = form.elements["options"].value;

        //createPoll(question, parseInt(duration), parseInt(amount), options);
        la(question, parseInt(duration), parseInt(amount), options);
    });
};

function create_poll_html(poll, id) {
    html = "<div class='poll-banner'>"
    html += "<b class='poll-question'>" + poll.question+ "</b>";
    html += "<a href='vote_poll.html?id="+id+"' class='poll-vote-btn'>V</a>";
    html += "<a href='bet_poll.html?id="+id+"' class='poll-bet-btn'>B</a>";
    html += "<p>Init_Amout: " + poll.initial_amount + " wei | ";
    html += "Open: " + poll.open+ "</p>";
    html += "<p>Start: " + new Date(poll.time_start* 1000)+ "</p>";
    html += "<p>End: " + new Date(poll.time_end* 1000)+ "</p>";
    html += "</div>"
    return html;
}

function create_polls(result) {
    document.getElementById('searched-polls').innerHTML = "";
    for (var i in Object.keys(result)) {
        html = create_poll_html(result[i],i);
        html += "<br>";
        document.getElementById('searched-polls').innerHTML += html;
    }
    /*
    document.querySelectorAll('.poll-bet-btn').forEach(item => {
      item.addEventListener('click', event => {
          alert("Vote in "+item.poll);
      })
    })*/
};


const getPolls= async () => {
  await contract.methods
    .getPolls()
    .call()
    .then(function (result) {
        create_polls(result)
    })
};


const get_polls_btn = document.querySelector("#refresh");
if (get_polls_btn) {
    get_polls_btn.addEventListener("click", function (event) {
        getPolls();
    });
};

function load_information(poll){
    document.getElementById('question').innerHTML = poll.question;
    text = "";
    for (opt in Object.keys(poll.options)) {
        text += opt + " -> "+poll.options[opt]+"\n";
    }
    document.getElementById('options').value = text;
}

const getPoll= async (id) => {
  await contract.methods
    .getPoll(id)
    .call()
    .then(function (result) {
        load_information(result)
    })
};

const votePoll= async (id, opt) => {
  await contract.methods
    .castVote(id, opt)
    .send({ from: account, value: 1000000000000000})
    .then(function (result) {                
        alert("Voted in "+opt);
    });
};

const form_poll_vote = document.querySelector("#form-poll-vote");
if (form_poll_vote) {
    let params = new URLSearchParams(document.location.search);
    let id = params.get("id");
    getPoll(id);
    form_poll_vote.addEventListener("submit", function (event) {
        // stop form submission
        event.preventDefault();
        form = form_poll_vote;
        let id = params.get("id");
        opt = form.elements["vote"].value;
        votePoll(id, opt);
    });
};

const betPoll= async (id, opt, amount) => {
  await contract.methods
    .placeBet(id, opt)
    .send({ from: account, value: amount})
    .then(function (result) {                
        alert("Bet in "+opt);
    });
};

const form_poll_bet = document.querySelector("#form-poll-bet");
if (form_poll_bet) {
    let params = new URLSearchParams(document.location.search);
    let id = params.get("id");
    getPoll(id);
    form_poll_bet.addEventListener("submit", function (event) {
        // stop form submission
        event.preventDefault();
        form = form_poll_bet;
        let id = params.get("id");
        opt = form.elements["vote"].value;
        amount = form.elements["amount"].value;
        amount_type = form.elements["amount-type"].value;
        amount = get_amount_in_weis(amount, amount_type);
        betPoll(id, opt, amount);
    });
};


const main = async () => {
    const accounts = await web3.eth.requestAccounts();
    account = accounts[0];

    if (accountEl) {
        accountEl.innerText = account;
    }
    //await refreshTickets();
};


main();
