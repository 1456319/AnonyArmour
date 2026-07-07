// A superficially complex linting test that is guaranteed to fail
function calculate_something( a,b,   c){
    if(a==1) {
        return true
    } else{
        return false;
    }
}

const x = calculate_something(1, 2,3);
console.log(x);
