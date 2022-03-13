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


const createPoll = async (question, duration, amount) => {
  return await contract.methods
    .createPoll(question, duration)
    .send({from: account, value: amount});
};

async function output_create_poll(question, duration, amount) {
    response = await createPoll(question, parseInt(duration), parseInt(amount));
    html = "";
    html += "Open: " + response.open;
    html += "Creator: " + response.creator;
    html += "Initial Amount: " + response.initial_amount;
    html += "Question: " + response.questions;
    html += "Options: " + response.options;
    html += "Time Start: " + response.time_start;
    html += "Time End: " + response.time_end;
    //document.getElementById("form-output").innerHTML = html;
};

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

        output_create_poll(question, parseInt(duration), parseInt(amount));
    });
};

function create_poll_html(poll) {
    html += "Open: " + response.open;
    html += "Creator: " + response.creator;
    html += "Initial Amount: " + response.initial_amount;
    html += "Question: " + response.questions;
    html += "Options: " + response.options;
    html += "Time Start: " + response.time_start;
    html += "Time End: " + response.time_end;
    return "<div>"+ html +"</div>";
}

function create_polls(result) {

    html = "";
    for (poll in result) {
        html += create_poll_html(poll);
        html += "<br>";
    }
    document.getElementById('searched-polls').innerHTML = html;
};


const getPolls= async () => {
  await contract.methods
    .getPolls()
    .call()
    .then(function (result) {
        create_polls(result)
    })
};

function loadPolls () {
    getPolls();
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
