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


const getPool= async (poll_id) => {
  await contract.methods
    .getPoll(poll_id)
    .call()
    .then(function (result) {
        document.getElementById('poll-info').innerHTML = result
    })
};


const createPoll = async (question, amount, vote_fee, dateend) => {
  await contract.methods
    .createPoll(vote_fee, question, dateend)
    .send({ from: account, value: 20});
};

const form = document.querySelector("#signup");
form.addEventListener("submit", function (event) {
	// stop form submission
	event.preventDefault();

	// validate the form
	question = form.elements["question"].value;
	amount = form.elements["amount"].value;
	vote_fee = form.elements["vote-amount"].value;
	dateend = form.elements["dateend"].value;
    createPoll(question, amount, vote_fee, 200)

});

const form_2 = document.querySelector("#getpoll");
form_2.addEventListener("submit", function (event) {
	// stop form submission
	event.preventDefault();

	// validate the form
	id = form_2.elements["id"].value;
    getPool(id);

});


const main = async () => {
  const accounts = await web3.eth.requestAccounts();
  account = accounts[0];
  accountEl.innerText = account;
  //await refreshTickets();
};

main();
