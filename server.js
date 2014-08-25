var express = require('express');
var bodyParser = require('body-parser');
var spawn = require('child_process').spawn;

var addKeyCommand = [
  // Validate the public key by getting a fingerprint for it. This will fail
  // for any invalid public key. This would *succeed* for any *private* key,
  // were it not for the fact that we forcibly convert every key to a single
  // line before performing this test - SSH does not have a valid single-line
  // format for private keys, so this test keeps them out, too.
  'ssh-keygen -lf /dev/stdin <<<"$0"',
  // Add it to the authorized_keys files
  'printf "%s" "$0" >> /root-ssh/authorized_keys',
  'printf "%s" "$0" >> /plushu-ssh/authorized_keys'].join(' && ');

var app = express();

app.set('domain', process.env.SANDBOX_DOMAIN);

app.use(express.static(__dirname + '/static'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.render('index.jade', {err: req.query.err});
});

app.post('/', function(req, res, next) {
  function bounceErr(err) {
    return res.redirect('/?err=' + encodeURIComponent(err));
  }
  var key = req.body && typeof req.body.ssh_key == 'string' &&
    req.body.ssh_key.replace(/[\r\n]/g,'').trim();
  if (key) {
    var addKey = spawn('bash', ['-ec', addKeyCommand, key+'\n']);
    addKey.on('close', function (code) {
      if (code) {
        return bounceErr('Invalid public key');
      } else {
        return res.redirect('/success');
      }
    });
  } else {
    return bounceErr('No key specified');
  }
});

app.get('/success', function(req, res, next) {
  res.render('success.jade');
});

app.listen(process.env.PORT || 5000, process.env.IP);
