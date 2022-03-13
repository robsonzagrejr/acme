pragma solidity ^0.8.7;
 
contract ACME {

    struct Poll // Enquete
    {
        bool open;
        address creator; // Criador da enquete
        uint initial_amount; // Montante inicial na enquete
        uint vote_fee; // Taxa de voto
        string question; // A pergunta da enquete
        string[] options; // As opções de resposta
        uint time_start; // Timestamp de início
        uint time_end; // Timestamp de fim
    }

    struct Vote // Voto
    {
        address voter; // Usuário eleitor
        uint id_option; // Opção em que o usuário votou
    }

    struct Bet // Aposta
    {
        address better; // Usuário apostador
        uint id_option; // Opção em que o usuário apostou
        uint value; // Valor da aposta
    }


    // Estruturas específicas para permitir o armazenamento
    struct VoteStorage {
        mapping(uint => Vote) stored_votes;
        uint n_votes;
    }

    struct BetStorage {
        mapping(uint => Bet) stored_bets;
        uint n_bets;
    }

    struct ParticipantsRecord {
        mapping(address => bool) participants;
    }

    mapping(uint => Poll) public polls;
    mapping(uint => VoteStorage) public votes;
    mapping(uint => BetStorage) public bets;
    mapping(uint => ParticipantsRecord) private participations;
    uint n_polls = 0; // o identificador das enquetes é um contador


    function createPoll(uint _vote_fee, string memory _question, uint _valid_period) public payable 
        returns (Poll memory) {
        uint ts = block.timestamp;
        polls[n_polls] = Poll({open: true, creator: msg.sender, initial_amount: msg.value, vote_fee: _vote_fee, question: _question,
                               options: new string[](0), time_start: ts, time_end: ts + _valid_period});
        n_polls = n_polls + 1;
        return polls[n_polls - 1];
    }


    function getPoll(uint _id) public view
        returns (Poll memory) {
        return polls[_id];
    }

    function getPolls() public view 
        returns (Poll[] memory) {
        Poll[] memory current_polls = new Poll[](n_polls);

        for (uint i = 0; i < n_polls; i++) {
            current_polls[i] = polls[i];
        }

        return current_polls;
    }


    function addOption(uint _id, string memory _option) public {
        Poll storage poll = polls[_id];
        if (msg.sender == poll.creator) {
            poll.options.push(_option);
        }
    }


    function getOptions(uint _id) public view
        returns (string[] memory) {
        return polls[_id].options;
    }


    function castVote(uint _id_poll, uint _id_option) public payable {
        require(_id_poll < n_polls);                                // enquete existe
        require(polls[_id_poll].open);                              // enquete aberta
        require(_id_option < polls[_id_poll].options.length);       // opção de resposta existe
        require(msg.value == polls[_id_poll].vote_fee);             // pagando a taxa para votos
        require(block.timestamp > polls[_id_poll].time_start && block.timestamp < polls[_id_poll].time_end);
                                                                    // voto no período de tempo aceitável
        require(!participations[_id_poll].participants[msg.sender]);// usuário não votou/apostou

        VoteStorage storage vote_storage = votes[_id_poll];
        uint idx = vote_storage.n_votes;
        vote_storage.stored_votes[idx] = Vote({voter: msg.sender, id_option: _id_option});
        vote_storage.n_votes = vote_storage.n_votes + 1;

        participations[_id_poll].participants[msg.sender] = true;
    }


    function getVotes(uint _id_poll) public view 
        returns (Vote[] memory) {

        uint n_votes = votes[_id_poll].n_votes;
        Vote[] memory vote_result = new Vote[](n_votes);

        for (uint i = 0; i < n_votes; i++) {
            vote_result[i] = votes[_id_poll].stored_votes[i];
        }

        return vote_result;
    }


    function placeBet(uint _id_poll, uint _id_option) 
        public payable {
        require(_id_poll < n_polls);                                // enquete existe
        require(polls[_id_poll].open);                              // enquete aberta
        require(_id_option < polls[_id_poll].options.length);       // opção de resposta existe
        require(block.timestamp > polls[_id_poll].time_start && block.timestamp < polls[_id_poll].time_end);
                                                                    // aposta no periodo aceitável
        require(!participations[_id_poll].participants[msg.sender]);// usuário não votou/apostou ainda

        BetStorage storage bet_storage = bets[_id_poll];
        uint idx = bet_storage.n_bets;
        bet_storage.stored_bets[idx] = Bet({better: msg.sender, id_option: _id_option, value: msg.value});
        bet_storage.n_bets = bet_storage.n_bets + 1;

        participations[_id_poll].participants[msg.sender] = true;
    }


    function getBets(uint _id_poll) public view 
        returns (Bet[] memory) {
 
        uint n_bets = bets[_id_poll].n_bets;
        Bet[] memory bets_array = new Bet[](n_bets);

        for (uint i = 0; i < n_bets; i++) {
            bets_array[i] = bets[_id_poll].stored_bets[i];
        }

        return bets_array;
    }


    // Calcula os votos para cada opção
    function tallyVotes(uint _id_poll) public view 
        returns (uint[] memory) {
        uint[] memory votes_total = new uint[](polls[_id_poll].options.length);
        mapping(uint => Vote) storage votes_in_storage = votes[_id_poll].stored_votes;
        Vote memory vote;

        for (uint i = 0; i < votes[_id_poll].n_votes; i++) {
            vote = votes_in_storage[i];
            votes_total[vote.id_option] += 1;
        }

        return votes_total;
    }

    // Resultado da enquete
    // Retorna um array de booleanos, em que uma posição é true
    // se a opção correspondente tem o número máximo de votos
    function getPollResult(uint _id_poll) public view 
        returns (bool[] memory) {
        bool[] memory result = new bool[](polls[_id_poll].options.length);

        uint[] memory votes_total = tallyVotes(_id_poll);

        uint max = 0;

        for (uint i = 0; i < votes_total.length; i++) {
            if (votes_total[i] > max) {
                max = votes_total[i];
            }
        }
        for (uint i = 0; i < votes_total.length; i++) {
            if (votes_total[i] == max) {
                result[i] = true;
            }
        }

        return result;
    }


    function computePrizes(uint _id_poll) public view 
        returns (uint, uint, bool[] memory) {
        bool[] memory result = getPollResult(_id_poll);

        mapping(uint => Bet) storage bets_in_storage = bets[_id_poll].stored_bets;

        // dinheiro dos perdedores, que será embolsado pelos outros participantes
        uint prize_money = 0; 

        // dinheiro a ser reembolsado (inicial + taxas dos votos + apostas dos vencedores)
        uint refund_money = polls[_id_poll].initial_amount + votes[_id_poll].n_votes * polls[_id_poll].vote_fee;

        for (uint i = 0; i < bets[_id_poll].n_bets; i++) {
            if (!result[bets_in_storage[i].id_option]) {
                prize_money += bets_in_storage[i].value;
            } else {
                refund_money += bets_in_storage[i].value;
            }
        }

        return (prize_money, refund_money, result);
    }


    function payReward(uint _id_poll, uint prize_money, uint refund_money, bool[] memory result) private 
        returns (uint, uint) {

        mapping(uint => Bet) storage bets_in_storage = bets[_id_poll].stored_bets;
        uint value_to_transfer;
        uint reward;

        // Queremos que os que apostaram mais sejam mais recompensados
        // total_bet_winners é o total apostado pelos vencedores
        uint total_bet_winners = refund_money - votes[_id_poll].n_votes * polls[_id_poll].vote_fee - polls[_id_poll].initial_amount;

        uint total_prize_money = prize_money;
        address payable to;

        for (uint i = 0; i < bets[_id_poll].n_bets; i++) {
            if (result[bets_in_storage[i].id_option]) {
                // Os vencedores recebem a aposta de volta, mais um valor de total_prize_money,
                // proporcional ao que apostaram
                reward = (total_prize_money * bets_in_storage[i].value) / total_bet_winners;
                value_to_transfer = bets_in_storage[i].value + reward;

                refund_money -= bets_in_storage[i].value;
                prize_money -= reward;

                // Mandando para cada um dos apostadores
                to = payable(bets_in_storage[i].better);
                (bool sent, bytes memory data) = to.call{value: value_to_transfer}("");
                require(sent, "Failed to send Ether");
            }
        }

        return (prize_money, refund_money);
    }


    function payVoters(uint _id_poll, uint prize_money, uint refund_money, bool[] memory result) private
        returns (uint, uint) {

        mapping(uint => Vote) storage votes_in_storage = votes[_id_poll].stored_votes;
        uint value_to_transfer;
        uint reward;

        uint total_prize_money = prize_money;
        address payable to;

        for (uint i = 0; i < votes[_id_poll].n_votes; i++) {
            if (result[votes_in_storage[i].id_option]) {
                // Os usuários que votaram simplesmente recebem o dinheiro de volta,
                // mais um pouco do montante dos que perderam
                reward = total_prize_money / votes[_id_poll].n_votes;
                value_to_transfer = polls[_id_poll].vote_fee + reward;

                refund_money -= polls[_id_poll].vote_fee;
                prize_money -= reward;
                
                // Mandando para cada um dos eleitores
                to = payable(votes_in_storage[i].voter);
                (bool sent, bytes memory data) = to.call{value: value_to_transfer}("");
                require(sent, "Failed to send Ether");
            }
        }

        return (prize_money, refund_money);
    }

    function closePoll(uint _id_poll) public {
        require(msg.sender == polls[_id_poll].creator);
        require(polls[_id_poll].open);
        require(block.timestamp > polls[_id_poll].time_end);

        bool[] memory result;

        uint prize_money;
        uint refund_money;
        uint money_left;

        (prize_money, refund_money, result) = computePrizes(_id_poll);

        // Tomamos cuidado para que nenhum dinheiro se perca com as divisões

        uint bettors_cut = (prize_money * 8) / 10; // 80% do dinheiro prêmio vai para os apostadores
        (money_left, refund_money) = payReward(_id_poll, bettors_cut, refund_money, result);
        prize_money = prize_money - bettors_cut + money_left;

        uint voters_cut = (prize_money) / 2; // O resto (20%) é dividido entre os usuários que votaram e o criador
        (money_left, refund_money) = payVoters(_id_poll, voters_cut, refund_money, result);
        prize_money = prize_money - voters_cut + money_left;

        uint creators_cut = refund_money + prize_money;

        // Mandando para o criador
        address to = payable(polls[_id_poll].creator);
        (bool sent, bytes memory data) = to.call{value: creators_cut}("");
        require(sent, "Failed to send Ether");

        polls[_id_poll].open = false;
    }

    
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
